const pool = require("../config/db");
const HttpError = require("../utils/httpError");

const PLAN_PRICES = {
  "1m": Number(process.env.SUBSCRIPTION_PRICE_1M || 2000),
  "3m": Number(process.env.SUBSCRIPTION_PRICE_3M || 5000),
  "1y": Number(process.env.SUBSCRIPTION_PRICE_1Y || 18000),
};
const ACADEMY_MONTHLY_PRICE = Number(process.env.ACADEMY_SUBSCRIPTION_PRICE_1M || 20000);

const PLAN_CATALOG = [
  { plan_type: "1m", duration_label: "1 Month", price: PLAN_PRICES["1m"], features: ["Basic tutor visibility", "Messaging", "Booking access"] },
  { plan_type: "3m", duration_label: "3 Months", price: PLAN_PRICES["3m"], features: ["Everything in 1m", "Priority listing", "Profile boost"] },
  { plan_type: "1y", duration_label: "1 Year", price: PLAN_PRICES["1y"], features: ["Everything in 3m", "Best value plan", "Long-term continuity"] },
];

function getPlans() {
  return PLAN_CATALOG;
}

async function getTutorCore(accountId) {
  const result = await pool.query(
    `
    SELECT t.tutor_id, w.wallet_id, w.balance
    FROM tutors t
    LEFT JOIN wallets w ON w.tutor_id = t.tutor_id
    WHERE t.account_id = $1
    LIMIT 1
    `,
    [accountId]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, "TUTOR_PROFILE_NOT_FOUND", "Tutor profile not found for this account");
  }

  if (!result.rows[0].wallet_id) {
    throw new HttpError(404, "WALLET_NOT_FOUND", "Wallet not found for tutor account");
  }

  return result.rows[0];
}

async function getAcademyCore(accountId) {
  const result = await pool.query(
    `
    SELECT ac.academy_id, w.wallet_id, w.balance
    FROM academies ac
    LEFT JOIN wallets w ON w.academy_id = ac.academy_id
    WHERE ac.account_id = $1
    LIMIT 1
    `,
    [accountId]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, "ACADEMY_PROFILE_NOT_FOUND", "Academy profile not found for this account");
  }

  if (!result.rows[0].wallet_id) {
    throw new HttpError(404, "WALLET_NOT_FOUND", "Wallet not found for academy account");
  }

  return result.rows[0];
}

async function purchaseTutorSubscription(accountId, planType, requestedStartDate = null) {
  const amount = PLAN_PRICES[planType];
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    throw new HttpError(500, "INVALID_SUBSCRIPTION_CONFIG", "Subscription plan price configuration is invalid");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tutorResult = await client.query(
      `SELECT tutor_id FROM tutors WHERE account_id = $1 LIMIT 1`,
      [accountId]
    );

    if (tutorResult.rowCount === 0) {
      throw new HttpError(404, "TUTOR_PROFILE_NOT_FOUND", "Tutor profile not found for this account");
    }

    const tutorId = tutorResult.rows[0].tutor_id;

    const activeSubscription = await client.query(
      `
      SELECT subscription_id, plan_type, start_at, end_at, start_date, end_date
      FROM subscriptions
      WHERE tutor_id = $1
        AND is_active = TRUE
        AND (
          (end_at IS NOT NULL AND end_at > NOW()) OR
          (end_at IS NULL AND end_date >= CURRENT_DATE)
        )
      ORDER BY COALESCE(start_at, start_date::timestamp) DESC
      LIMIT 1
      FOR UPDATE
      `,
      [tutorId]
    );

    if (activeSubscription.rowCount > 0) {
      throw new HttpError(
        409,
        "SUBSCRIPTION_ALREADY_ACTIVE",
        "Tutor already has an active subscription. Wait for expiry before purchasing again.",
        { active_subscription: activeSubscription.rows[0] }
      );
    }

    const academyMemberCheck = await client.query(
      `
      SELECT membership_id
      FROM academy_tutor_members
      WHERE tutor_id = $1 AND is_active = TRUE
      LIMIT 1
      `,
      [tutorId]
    );

    if (academyMemberCheck.rowCount > 0) {
      throw new HttpError(
        409,
        "ACADEMY_TUTOR_NOT_ELIGIBLE",
        "Tutors linked to academies cannot purchase individual tutor subscriptions"
      );
    }

    const walletResult = await client.query(
      `SELECT wallet_id, balance FROM wallets WHERE tutor_id = $1 FOR UPDATE`,
      [tutorId]
    );

    if (walletResult.rowCount === 0) {
      throw new HttpError(404, "WALLET_NOT_FOUND", "Wallet not found for tutor account");
    }

    const wallet = walletResult.rows[0];
    const balanceBefore = Number(wallet.balance);

    if (balanceBefore < amount) {
      throw new HttpError(409, "INSUFFICIENT_BALANCE", "Insufficient wallet balance for selected subscription plan", {
        required: amount,
        available: balanceBefore,
      });
    }

    const startAtResult = await client.query(
      `SELECT COALESCE($1::timestamp, NOW()) AS start_at`,
      [requestedStartDate]
    );
    const startAt = startAtResult.rows[0].start_at;

    await client.query(
      `UPDATE subscriptions
       SET is_active = FALSE
       WHERE tutor_id = $1 AND is_active = TRUE`,
      [tutorId]
    );

    const insertSubscriptionResult = await client.query(
      `
      INSERT INTO subscriptions (tutor_id, plan_type, start_at, end_at, start_date, end_date, is_active)
      VALUES (
        $1,
        $2::varchar,
        $3::timestamp,
        (
          $3::timestamp +
          CASE
            WHEN $2::text = '1m' THEN INTERVAL '1 month'
            WHEN $2::text = '3m' THEN INTERVAL '3 months'
            WHEN $2::text = '1y' THEN INTERVAL '1 year'
          END
        ),
        $3::date,
        (
          $3::timestamp +
          CASE
            WHEN $2::text = '1m' THEN INTERVAL '1 month'
            WHEN $2::text = '3m' THEN INTERVAL '3 months'
            WHEN $2::text = '1y' THEN INTERVAL '1 year'
          END
        )::date,
        TRUE
      )
      RETURNING subscription_id, tutor_id, plan_type, start_at, end_at, start_date, end_date, is_active
      `,
      [tutorId, planType, startAt]
    );

    const walletUpdateResult = await client.query(
      `
      UPDATE wallets
      SET balance = balance - $1
      WHERE wallet_id = $2
      RETURNING balance
      `,
      [amount, wallet.wallet_id]
    );

    await client.query("COMMIT");

    return {
      subscription: insertSubscriptionResult.rows[0],
      payment: {
        amount,
        currency: "PKR",
      },
      wallet: {
        wallet_id: wallet.wallet_id,
        balance_before: balanceBefore,
        balance_after: Number(walletUpdateResult.rows[0].balance),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function purchaseAcademySubscription(accountId, requestedStartDate = null) {
  const amount = ACADEMY_MONTHLY_PRICE;
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    throw new HttpError(500, "INVALID_SUBSCRIPTION_CONFIG", "Academy subscription price configuration is invalid");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const academyResult = await client.query(`SELECT academy_id FROM academies WHERE account_id = $1 LIMIT 1`, [accountId]);
    if (academyResult.rowCount === 0) {
      throw new HttpError(404, "ACADEMY_PROFILE_NOT_FOUND", "Academy profile not found for this account");
    }

    const academyId = academyResult.rows[0].academy_id;

    const activeSubscription = await client.query(
      `
      SELECT subscription_id, plan_type, start_at, end_at, start_date, end_date
      FROM subscriptions
      WHERE academy_id = $1
        AND is_active = TRUE
        AND (
          (end_at IS NOT NULL AND end_at > NOW()) OR
          (end_at IS NULL AND end_date >= CURRENT_DATE)
        )
      ORDER BY COALESCE(start_at, start_date::timestamp) DESC
      LIMIT 1
      FOR UPDATE
      `,
      [academyId]
    );

    if (activeSubscription.rowCount > 0) {
      throw new HttpError(
        409,
        "SUBSCRIPTION_ALREADY_ACTIVE",
        "Academy already has an active subscription. Wait for expiry before purchasing again.",
        { active_subscription: activeSubscription.rows[0] }
      );
    }

    const walletResult = await client.query(
      `SELECT wallet_id, balance FROM wallets WHERE academy_id = $1 FOR UPDATE`,
      [academyId]
    );

    if (walletResult.rowCount === 0) {
      throw new HttpError(404, "WALLET_NOT_FOUND", "Wallet not found for academy account");
    }

    const wallet = walletResult.rows[0];
    const balanceBefore = Number(wallet.balance);
    if (balanceBefore < amount) {
      throw new HttpError(409, "INSUFFICIENT_BALANCE", "Insufficient wallet balance for academy subscription", {
        required: amount,
        available: balanceBefore,
      });
    }

    const startAtResult = await client.query(`SELECT COALESCE($1::timestamp, NOW()) AS start_at`, [requestedStartDate]);
    const startAt = startAtResult.rows[0].start_at;

    await client.query(`UPDATE subscriptions SET is_active = FALSE WHERE academy_id = $1 AND is_active = TRUE`, [academyId]);

    const subscription = await client.query(
      `
      INSERT INTO subscriptions (academy_id, plan_type, start_at, end_at, start_date, end_date, is_active)
      VALUES ($1, '1m', $2::timestamp, ($2::timestamp + INTERVAL '1 month'), $2::date, ($2::timestamp + INTERVAL '1 month')::date, TRUE)
      RETURNING subscription_id, academy_id, plan_type, start_at, end_at, start_date, end_date, is_active
      `,
      [academyId, startAt]
    );

    const walletAfter = await client.query(
      `UPDATE wallets SET balance = balance - $1 WHERE wallet_id = $2 RETURNING balance`,
      [amount, wallet.wallet_id]
    );

    await client.query("COMMIT");

    return {
      subscription: subscription.rows[0],
      payment: {
        amount,
        currency: "PKR",
      },
      wallet: {
        wallet_id: wallet.wallet_id,
        balance_before: balanceBefore,
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

async function getMyTutorSubscriptions(accountId) {
  const query = `
    SELECT s.subscription_id, s.plan_type, s.start_at, s.end_at, s.start_date, s.end_date, s.is_active,
           w.wallet_id, w.balance
    FROM tutors t
    LEFT JOIN subscriptions s ON s.tutor_id = t.tutor_id
    LEFT JOIN wallets w ON w.tutor_id = t.tutor_id
    WHERE t.account_id = $1
    ORDER BY COALESCE(s.start_at, s.start_date::timestamp) DESC NULLS LAST
  `;

  const result = await pool.query(query, [accountId]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "TUTOR_PROFILE_NOT_FOUND", "Tutor profile not found for this account");
  }

  const wallet_id = result.rows[0].wallet_id;
  const wallet_balance = result.rows[0].balance;

  return {
    wallet: {
      wallet_id,
      balance: wallet_balance !== null ? Number(wallet_balance) : null,
    },
    subscriptions: result.rows
      .filter((r) => r.subscription_id !== null)
      .map((r) => ({
        subscription_id: r.subscription_id,
        plan_type: r.plan_type,
        start_at: r.start_at,
        end_at: r.end_at,
        start_date: r.start_date,
        end_date: r.end_date,
        is_active: r.is_active,
      })),
  };
}

async function getTutorSubscriptionStatus(accountId) {
  const core = await getTutorCore(accountId);

  const activeSubResult = await pool.query(
    `
    SELECT subscription_id, plan_type, start_at, end_at, start_date, end_date, is_active
    FROM subscriptions
    WHERE tutor_id = $1 AND is_active = TRUE
    ORDER BY COALESCE(start_at, start_date::timestamp) DESC
    LIMIT 1
    `,
    [core.tutor_id]
  );

  const active = activeSubResult.rows[0] || null;
  const walletBalance = Number(core.balance || 0);
  const cheapestPlan = Math.min(...PLAN_CATALOG.map((p) => Number(p.price || 0)).filter((p) => p > 0));
  const hasEnoughForAnyPlan = walletBalance >= cheapestPlan;

  let nextAction = "none";
  if (!active && !hasEnoughForAnyPlan) nextAction = "topup_required";
  if (!active && hasEnoughForAnyPlan) nextAction = "purchase_required";

  return {
    wallet: {
      wallet_id: core.wallet_id,
      balance: walletBalance,
    },
    active_subscription: active,
    has_active_subscription: Boolean(active),
    has_enough_for_any_plan: hasEnoughForAnyPlan,
    next_action: nextAction,
    plans: PLAN_CATALOG,
  };
}

async function topupTutorWallet(accountId, amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new HttpError(400, "INVALID_TOPUP_AMOUNT", "Top-up amount must be a positive number");
  }

  const maxTopup = Number(process.env.TOPUP_MAX_AMOUNT || 100000);
  if (numericAmount > maxTopup) {
    throw new HttpError(400, "TOPUP_LIMIT_EXCEEDED", `Top-up amount must be <= ${maxTopup}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const core = await client.query(
      `
      SELECT t.tutor_id, w.wallet_id, w.balance
      FROM tutors t
      JOIN wallets w ON w.tutor_id = t.tutor_id
      WHERE t.account_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [accountId]
    );

    if (core.rowCount === 0) {
      throw new HttpError(404, "WALLET_NOT_FOUND", "Wallet not found for tutor account");
    }

    const row = core.rows[0];
    const before = Number(row.balance);

    const updated = await client.query(
      `
      UPDATE wallets
      SET balance = balance + $1
      WHERE wallet_id = $2
      RETURNING balance
      `,
      [numericAmount, row.wallet_id]
    );

    await client.query("COMMIT");

    return {
      tutor_id: row.tutor_id,
      wallet_id: row.wallet_id,
      topup_amount: numericAmount,
      balance_before: before,
      balance_after: Number(updated.rows[0].balance),
      currency: "PKR",
      note: "Top-up applied to wallet.",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getMyAcademySubscriptions(accountId) {
  const query = `
    SELECT s.subscription_id, s.plan_type, s.start_at, s.end_at, s.start_date, s.end_date, s.is_active,
           w.wallet_id, w.balance
    FROM academies ac
    LEFT JOIN subscriptions s ON s.academy_id = ac.academy_id
    LEFT JOIN wallets w ON w.academy_id = ac.academy_id
    WHERE ac.account_id = $1
    ORDER BY COALESCE(s.start_at, s.start_date::timestamp) DESC NULLS LAST
  `;

  const result = await pool.query(query, [accountId]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "ACADEMY_PROFILE_NOT_FOUND", "Academy profile not found for this account");
  }

  return {
    wallet: {
      wallet_id: result.rows[0].wallet_id,
      balance: result.rows[0].balance !== null ? Number(result.rows[0].balance) : null,
    },
    subscriptions: result.rows
      .filter((r) => r.subscription_id !== null)
      .map((r) => ({
        subscription_id: r.subscription_id,
        plan_type: r.plan_type,
        start_at: r.start_at,
        end_at: r.end_at,
        start_date: r.start_date,
        end_date: r.end_date,
        is_active: r.is_active,
      })),
  };
}

async function getAcademySubscriptionStatus(accountId) {
  const core = await getAcademyCore(accountId);

  const activeSubResult = await pool.query(
    `
    SELECT subscription_id, plan_type, start_at, end_at, start_date, end_date, is_active
    FROM subscriptions
    WHERE academy_id = $1 AND is_active = TRUE
    ORDER BY COALESCE(start_at, start_date::timestamp) DESC
    LIMIT 1
    `,
    [core.academy_id]
  );

  const active = activeSubResult.rows[0] || null;
  const walletBalance = Number(core.balance || 0);
  const hasEnough = walletBalance >= ACADEMY_MONTHLY_PRICE;

  let nextAction = "none";
  if (!active && !hasEnough) nextAction = "topup_required";
  if (!active && hasEnough) nextAction = "purchase_required";

  return {
    wallet: {
      wallet_id: core.wallet_id,
      balance: walletBalance,
    },
    active_subscription: active,
    has_active_subscription: Boolean(active),
    has_enough_for_subscription: hasEnough,
    next_action: nextAction,
    pricing: {
      monthly_price: ACADEMY_MONTHLY_PRICE,
      currency: "PKR",
    },
  };
}

async function topupAcademyWallet(accountId, amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new HttpError(400, "INVALID_TOPUP_AMOUNT", "Top-up amount must be a positive number");
  }

  const maxTopup = Number(process.env.TOPUP_MAX_AMOUNT || 100000);
  if (numericAmount > maxTopup) {
    throw new HttpError(400, "TOPUP_LIMIT_EXCEEDED", `Top-up amount must be <= ${maxTopup}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const core = await client.query(
      `
      SELECT ac.academy_id, w.wallet_id, w.balance
      FROM academies ac
      JOIN wallets w ON w.academy_id = ac.academy_id
      WHERE ac.account_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [accountId]
    );

    if (core.rowCount === 0) {
      throw new HttpError(404, "WALLET_NOT_FOUND", "Wallet not found for academy account");
    }

    const row = core.rows[0];
    const before = Number(row.balance);

    const updated = await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2 RETURNING balance`,
      [numericAmount, row.wallet_id]
    );

    await client.query("COMMIT");

    return {
      academy_id: row.academy_id,
      wallet_id: row.wallet_id,
      topup_amount: numericAmount,
      balance_before: before,
      balance_after: Number(updated.rows[0].balance),
      currency: "PKR",
      note: "Top-up applied to academy wallet.",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getPlans,
  purchaseTutorSubscription,
  getMyTutorSubscriptions,
  getTutorSubscriptionStatus,
  topupTutorWallet,
  purchaseAcademySubscription,
  getMyAcademySubscriptions,
  getAcademySubscriptionStatus,
  topupAcademyWallet,
};
