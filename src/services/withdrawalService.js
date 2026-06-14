const pool = require("../config/db");
const HttpError = require("../utils/httpError");

async function getTutorWalletByAccount(accountId, client, forUpdate = false) {
  const lockClause = forUpdate ? "FOR UPDATE" : "";
  const result = await client.query(
    `
    SELECT t.tutor_id, w.wallet_id, w.balance
    FROM tutors t
    JOIN wallets w ON w.tutor_id = t.tutor_id
    WHERE t.account_id = $1
    LIMIT 1
    ${lockClause}
    `,
    [accountId]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, "WALLET_NOT_FOUND", "Tutor wallet not found for this account");
  }

  return result.rows[0];
}

async function getAdminIdByAccount(accountId, client) {
  const result = await client.query(`SELECT admin_id FROM admins WHERE account_id = $1 LIMIT 1`, [accountId]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "ADMIN_PROFILE_NOT_FOUND", "Admin profile not found for this account");
  }
  return result.rows[0].admin_id;
}

async function requestTutorWithdrawal(accountId, payload) {
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, "INVALID_WITHDRAWAL_AMOUNT", "Withdrawal amount must be a positive number");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const wallet = await getTutorWalletByAccount(accountId, client, true);
    const balanceBefore = Number(wallet.balance);

    if (balanceBefore < amount) {
      throw new HttpError(409, "INSUFFICIENT_BALANCE", "Insufficient wallet balance for withdrawal", {
        required: amount,
        available: balanceBefore,
      });
    }

    const referenceCode = `SIM-WDR-${Date.now()}`;
    const requestResult = await client.query(
      `
      INSERT INTO withdrawal_requests (
        wallet_id, amount, status, requested_at,
        provider, account_title, account_number, destination_note, reference_code
      )
      VALUES ($1, $2, 'pending', NOW(), $3, $4, $5, $6, $7)
      RETURNING withdrawal_id, wallet_id, amount, status, requested_at, provider, account_title, account_number, destination_note, reference_code
      `,
      [
        wallet.wallet_id,
        amount,
        payload.provider,
        payload.account_title,
        payload.account_number,
        payload.destination_note || null,
        referenceCode,
      ]
    );

    const walletUpdate = await client.query(
      `UPDATE wallets SET balance = balance - $1 WHERE wallet_id = $2 RETURNING balance`,
      [amount, wallet.wallet_id]
    );

    await client.query("COMMIT");

    return {
      withdrawal: requestResult.rows[0],
      wallet: {
        wallet_id: wallet.wallet_id,
        balance_before: balanceBefore,
        balance_after: Number(walletUpdate.rows[0].balance),
      },
      simulation: {
        transfer_mode: "simulated",
        message: "No real payout is performed. This is a simulation record only.",
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getMyTutorWithdrawals(accountId) {
  const result = await pool.query(
    `
    SELECT
      wr.withdrawal_id,
      wr.amount,
      wr.status,
      wr.requested_at,
      wr.processed_at,
      wr.provider,
      wr.account_title,
      wr.account_number,
      wr.destination_note,
      wr.reference_code,
      wr.review_note
    FROM withdrawal_requests wr
    JOIN wallets w ON w.wallet_id = wr.wallet_id
    JOIN tutors t ON t.tutor_id = w.tutor_id
    WHERE t.account_id = $1
    ORDER BY wr.requested_at DESC
    `,
    [accountId]
  );

  return result.rows;
}

async function getPendingWithdrawalsForAdmin() {
  const result = await pool.query(
    `
    SELECT
      wr.withdrawal_id,
      wr.amount,
      wr.status,
      wr.requested_at,
      wr.provider,
      wr.account_title,
      wr.account_number,
      wr.destination_note,
      wr.reference_code,
      w.wallet_id,
      t.tutor_id,
      a.email AS tutor_email
    FROM withdrawal_requests wr
    JOIN wallets w ON w.wallet_id = wr.wallet_id
    JOIN tutors t ON t.tutor_id = w.tutor_id
    JOIN accounts a ON a.account_id = t.account_id
    WHERE wr.status = 'pending'
    ORDER BY wr.requested_at ASC
    `
  );

  return result.rows;
}

async function reviewWithdrawal(adminAccountId, withdrawalId, decision, reviewNote = null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const adminId = await getAdminIdByAccount(adminAccountId, client);

    const row = await client.query(
      `
      SELECT wr.withdrawal_id, wr.wallet_id, wr.amount, wr.status, w.balance
      FROM withdrawal_requests wr
      JOIN wallets w ON w.wallet_id = wr.wallet_id
      WHERE wr.withdrawal_id = $1
      FOR UPDATE OF wr, w
      `,
      [withdrawalId]
    );

    if (row.rowCount === 0) {
      throw new HttpError(404, "WITHDRAWAL_NOT_FOUND", "Withdrawal request not found");
    }

    const request = row.rows[0];
    if (request.status !== "pending") {
      throw new HttpError(409, "ALREADY_REVIEWED", "Withdrawal request has already been reviewed", {
        current_status: request.status,
      });
    }

    if (decision === "approved") {
      const result = await client.query(
        `
        UPDATE withdrawal_requests
        SET status = 'approved', processed_at = NOW(), admin_id = $2, review_note = $3
        WHERE withdrawal_id = $1
        RETURNING withdrawal_id, amount, status, processed_at, admin_id, review_note
        `,
        [withdrawalId, adminId, reviewNote]
      );

      await client.query("COMMIT");
      return {
        action: "approved",
        withdrawal: result.rows[0],
      };
    }

    await client.query(`UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2`, [request.amount, request.wallet_id]);

    const rejected = await client.query(
      `
      UPDATE withdrawal_requests
      SET status = 'rejected', processed_at = NOW(), admin_id = $2, review_note = $3
      WHERE withdrawal_id = $1
      RETURNING withdrawal_id, amount, status, processed_at, admin_id, review_note
      `,
      [withdrawalId, adminId, reviewNote]
    );

    const walletAfter = await client.query(`SELECT wallet_id, balance FROM wallets WHERE wallet_id = $1`, [request.wallet_id]);

    await client.query("COMMIT");
    return {
      action: "rejected_refunded",
      withdrawal: rejected.rows[0],
      wallet: {
        wallet_id: request.wallet_id,
        balance_after: Number(walletAfter.rows[0].balance),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  requestTutorWithdrawal,
  getMyTutorWithdrawals,
  getPendingWithdrawalsForAdmin,
  reviewWithdrawal,
};
