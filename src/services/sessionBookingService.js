const pool = require("../config/db");
const HttpError = require("../utils/httpError");

const SESSION_PRICE = Number(process.env.SESSION_PRICE || 1000);
const FIXED_SLOTS = [
  { slot_id: "s1", start_time: "10:00", end_time: "11:00" },
  { slot_id: "s2", start_time: "11:00", end_time: "12:00" },
  { slot_id: "s3", start_time: "15:00", end_time: "16:00" },
  { slot_id: "s4", start_time: "16:00", end_time: "17:00" },
];

function getSlotById(slotId) {
  return FIXED_SLOTS.find((s) => s.slot_id === slotId) || null;
}

function combineDateTime(dateStr, timeStr) {
  return `${dateStr} ${timeStr}:00`;
}

async function ensureStudentWallet(client, studentId) {
  await client.query(
    `INSERT INTO student_wallets (student_id, balance) VALUES ($1, 0) ON CONFLICT (student_id) DO NOTHING`,
    [studentId]
  );

  const wallet = await client.query(
    `SELECT wallet_id, balance FROM student_wallets WHERE student_id = $1 FOR UPDATE`,
    [studentId]
  );

  if (wallet.rowCount === 0) {
    throw new HttpError(500, "STUDENT_WALLET_ERROR", "Failed to load student wallet");
  }

  return wallet.rows[0];
}

async function getStudentIdByAccount(accountId) {
  const result = await pool.query(`SELECT student_id FROM students WHERE account_id = $1 LIMIT 1`, [accountId]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "STUDENT_PROFILE_NOT_FOUND", "Student profile not found for this account");
  }
  return result.rows[0].student_id;
}

async function getTutorIdByAccount(accountId) {
  const result = await pool.query(`SELECT tutor_id FROM tutors WHERE account_id = $1 LIMIT 1`, [accountId]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "TUTOR_PROFILE_NOT_FOUND", "Tutor profile not found for this account");
  }
  return result.rows[0].tutor_id;
}

async function listAvailableTutors() {
  const result = await pool.query(
    `
    SELECT
      t.tutor_id,
      t.name,
      t.city,
      t.country,
      t.teaching_mode,
      t.is_verified,
      a.email,
      s.plan_type,
      s.end_date,
      s.end_at
    FROM tutors t
    JOIN accounts a ON a.account_id = t.account_id
    LEFT JOIN academy_tutor_members atm
      ON atm.tutor_id = t.tutor_id AND atm.is_active = TRUE
    JOIN subscriptions s
      ON s.tutor_id = t.tutor_id
     AND s.is_active = TRUE
     AND (
       (s.end_at IS NOT NULL AND s.end_at > NOW()) OR
       (s.end_at IS NULL AND s.end_date >= CURRENT_DATE)
     )
    WHERE atm.membership_id IS NULL
    ORDER BY t.tutor_id DESC
    `
  );

  return result.rows;
}

async function getTutorSlots(tutorId, date) {
  const booked = await pool.query(
    `
    SELECT TO_CHAR(session_datetime, 'HH24:MI') AS slot_time
    FROM bookings
    WHERE tutor_id = $1
      AND DATE(session_datetime) = $2::date
      AND booking_status IN ('pending','confirmed','completed')
    `,
    [tutorId, date]
  );

  const bookedTimes = new Set(
    booked.rows.map((r) => r.slot_time)
  );

  return FIXED_SLOTS.map((slot) => ({
    ...slot,
    is_booked: bookedTimes.has(slot.start_time),
    is_available: !bookedTimes.has(slot.start_time),
  }));
}

async function bookTutorSession({ studentAccountId, tutorId, date, slotId }) {
  const slot = getSlotById(slotId);
  if (!slot) {
    throw new HttpError(400, "INVALID_SLOT", "Invalid slot selected");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tutorCheck = await client.query(
      `
      SELECT t.tutor_id
      FROM tutors t
      LEFT JOIN academy_tutor_members atm
        ON atm.tutor_id = t.tutor_id AND atm.is_active = TRUE
      JOIN subscriptions s
        ON s.tutor_id = t.tutor_id
       AND s.is_active = TRUE
       AND (
         (s.end_at IS NOT NULL AND s.end_at > NOW()) OR
         (s.end_at IS NULL AND s.end_date >= CURRENT_DATE)
        )
      WHERE t.tutor_id = $1
        AND atm.membership_id IS NULL
      LIMIT 1
      `,
      [tutorId]
    );

    if (tutorCheck.rowCount === 0) {
      throw new HttpError(404, "TUTOR_NOT_BOOKABLE", "Tutor not found or has no active subscription");
    }

    const student = await client.query(`SELECT student_id FROM students WHERE account_id = $1 LIMIT 1`, [studentAccountId]);
    if (student.rowCount === 0) {
      throw new HttpError(404, "STUDENT_PROFILE_NOT_FOUND", "Student profile not found for this account");
    }
    const studentId = student.rows[0].student_id;

    const wallet = await ensureStudentWallet(client, studentId);
    const walletBefore = Number(wallet.balance);

    if (walletBefore < SESSION_PRICE) {
      throw new HttpError(409, "INSUFFICIENT_STUDENT_BALANCE", "Insufficient student wallet balance", {
        required: SESSION_PRICE,
        available: walletBefore,
      });
    }

    const sessionDateTime = combineDateTime(date, slot.start_time);
    const sessionTs = new Date(sessionDateTime);
    if (Number.isNaN(sessionTs.getTime()) || sessionTs.getTime() <= Date.now()) {
      throw new HttpError(400, "INVALID_SESSION_TIME", "Session date/time must be in the future");
    }

    const conflict = await client.query(
      `
      SELECT booking_id
      FROM bookings
      WHERE tutor_id = $1
        AND session_datetime = $2::timestamp
        AND booking_status IN ('pending','confirmed','completed')
      FOR UPDATE
      `,
      [tutorId, sessionDateTime]
    );

    if (conflict.rowCount > 0) {
      throw new HttpError(409, "SLOT_ALREADY_BOOKED", "Selected slot is already booked");
    }

    const bookingResult = await client.query(
      `
      INSERT INTO bookings (
        student_id,
        tutor_id,
        booking_type,
        session_datetime,
        amount_total,
        booking_status,
        escrow_status,
        student_confirmed,
        tutor_confirmed,
        confirmation_status
      )
      VALUES ($1, $2, 'tutor', $3::timestamp, $4, 'confirmed', 'held', FALSE, FALSE, 'pending')
      RETURNING booking_id, student_id, tutor_id, session_datetime, amount_total, tutor_or_academy_amount, commission_amount, booking_status, escrow_status, confirmation_status
      `,
      [studentId, tutorId, sessionDateTime, SESSION_PRICE]
    );

    const booking = bookingResult.rows[0];

    await client.query(
      `
      INSERT INTO payments (
        booking_id,
        amount_total,
        tutor_or_academy_amount,
        commission_amount,
        currency,
        payment_method,
        payment_status,
        escrow_status,
        paid_at,
        transaction_reference
      )
      VALUES ($1, $2, $3, $4, 'PKR', 'student_wallet', 'completed', 'held', NOW(), $5)
      `,
      [
        booking.booking_id,
        booking.amount_total,
        booking.tutor_or_academy_amount,
        booking.commission_amount,
        `BOOK-${booking.booking_id}-${Date.now()}`,
      ]
    );

    const walletAfter = await client.query(
      `UPDATE student_wallets SET balance = balance - $1 WHERE wallet_id = $2 RETURNING balance`,
      [SESSION_PRICE, wallet.wallet_id]
    );

    await client.query("COMMIT");

    return {
      booking,
      payment: {
        amount_total: Number(booking.amount_total),
        escrow_status: "held",
      },
      student_wallet: {
        wallet_id: wallet.wallet_id,
        balance_before: walletBefore,
        balance_after: Number(walletAfter.rows[0].balance),
      },
      slot,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function confirmSession({ accountId, role, bookingId, confirmed }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bookingResult = await client.query(
      `
      SELECT b.*, p.payment_id, p.payment_status, p.escrow_status AS payment_escrow_status
      FROM bookings b
      LEFT JOIN payments p ON p.booking_id = b.booking_id
      WHERE b.booking_id = $1
      FOR UPDATE OF b
      `,
      [bookingId]
    );

    if (bookingResult.rowCount === 0) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }

    const booking = bookingResult.rows[0];

    if (role === "student") {
      const studentId = await getStudentIdByAccount(accountId);
      if (Number(booking.student_id) !== Number(studentId)) {
        throw new HttpError(403, "FORBIDDEN", "This booking does not belong to student");
      }
    } else if (role === "tutor") {
      const tutorId = await getTutorIdByAccount(accountId);
      if (Number(booking.tutor_id) !== Number(tutorId)) {
        throw new HttpError(403, "FORBIDDEN", "This booking does not belong to tutor");
      }
    } else {
      throw new HttpError(403, "FORBIDDEN", "Only student or tutor can confirm session");
    }

    const setColumn = role === "student" ? "student_confirmed" : "tutor_confirmed";

    await client.query(
      `UPDATE bookings SET ${setColumn} = $2 WHERE booking_id = $1`,
      [bookingId, confirmed]
    );

    const refresh = await client.query(
      `SELECT * FROM bookings WHERE booking_id = $1 FOR UPDATE`,
      [bookingId]
    );
    const b = refresh.rows[0];

    if (b.escrow_status !== "held") {
      await client.query("COMMIT");
      return {
        booking_id: b.booking_id,
        escrow_status: b.escrow_status,
        booking_status: b.booking_status,
        confirmation_status: b.confirmation_status,
        message: "Escrow already processed",
      };
    }

    if (b.student_confirmed === true && b.tutor_confirmed === true) {
      const tutorWallet = await client.query(
        `SELECT wallet_id, balance FROM wallets WHERE tutor_id = $1 FOR UPDATE`,
        [b.tutor_id]
      );

      if (tutorWallet.rowCount === 0) {
        throw new HttpError(404, "TUTOR_WALLET_NOT_FOUND", "Tutor wallet not found");
      }

      const releaseAmount = Number(b.tutor_or_academy_amount);

      await client.query(
        `UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2`,
        [releaseAmount, tutorWallet.rows[0].wallet_id]
      );

      await client.query(
        `UPDATE payments
         SET escrow_status = 'released', payment_status = 'completed', paid_at = COALESCE(paid_at, NOW())
         WHERE booking_id = $1`,
        [b.booking_id]
      );

      await client.query(
        `UPDATE bookings
         SET escrow_status = 'released', booking_status = 'completed', confirmation_status = 'confirmed_by_both'
         WHERE booking_id = $1`,
        [b.booking_id]
      );

      await client.query("COMMIT");
      return {
        booking_id: b.booking_id,
        action: "released",
        released_amount: releaseAmount,
        message: "Both confirmations received. Escrow released to tutor.",
      };
    }

    if (confirmed === false) {
      const studentWallet = await ensureStudentWallet(client, b.student_id);
      const refundAmount = Number(b.amount_total);

      await client.query(
        `UPDATE student_wallets SET balance = balance + $1 WHERE wallet_id = $2`,
        [refundAmount, studentWallet.wallet_id]
      );

      await client.query(
        `UPDATE payments
         SET escrow_status = 'refunded', payment_status = 'refunded'
         WHERE booking_id = $1`,
        [b.booking_id]
      );

      await client.query(
        `UPDATE bookings
         SET escrow_status = 'refunded', booking_status = 'cancelled', confirmation_status = 'disputed'
         WHERE booking_id = $1`,
        [b.booking_id]
      );

      await client.query("COMMIT");
      return {
        booking_id: b.booking_id,
        action: "refunded",
        refunded_amount: refundAmount,
        message: "Session disputed/not confirmed by both. Amount refunded to student.",
      };
    }

    await client.query(
      `UPDATE bookings SET confirmation_status = 'pending' WHERE booking_id = $1`,
      [b.booking_id]
    );

    await client.query("COMMIT");
    return {
      booking_id: b.booking_id,
      action: "pending",
      message: "Waiting for both student and tutor confirmation.",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function topupStudentWallet(accountId, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, "INVALID_TOPUP_AMOUNT", "Top-up amount must be positive");
  }

  const max = Number(process.env.TOPUP_MAX_AMOUNT || 100000);
  if (value > max) {
    throw new HttpError(400, "TOPUP_LIMIT_EXCEEDED", `Top-up amount must be <= ${max}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const studentId = await (async () => {
      const r = await client.query(`SELECT student_id FROM students WHERE account_id = $1 LIMIT 1`, [accountId]);
      if (r.rowCount === 0) throw new HttpError(404, "STUDENT_PROFILE_NOT_FOUND", "Student profile not found");
      return r.rows[0].student_id;
    })();

    const wallet = await ensureStudentWallet(client, studentId);
    const before = Number(wallet.balance);

    const updated = await client.query(
      `UPDATE student_wallets SET balance = balance + $1 WHERE wallet_id = $2 RETURNING balance`,
      [value, wallet.wallet_id]
    );

    await client.query("COMMIT");
    return {
      wallet_id: wallet.wallet_id,
      topup_amount: value,
      balance_before: before,
      balance_after: Number(updated.rows[0].balance),
      currency: "PKR",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getMyBookings(accountId, role) {
  if (role === "student") {
    const studentId = await getStudentIdByAccount(accountId);
    const result = await pool.query(
      `
      SELECT b.booking_id, b.booking_type, b.session_datetime, b.booking_status, b.escrow_status,
             b.amount_total, b.student_confirmed, b.tutor_confirmed, b.confirmation_status,
             t.name AS tutor_name, a.email AS tutor_email
      FROM bookings b
      LEFT JOIN tutors t ON t.tutor_id = b.tutor_id
      LEFT JOIN accounts a ON a.account_id = t.account_id
      WHERE b.student_id = $1
      ORDER BY b.created_at DESC
      `,
      [studentId]
    );
    return result.rows;
  }

  if (role === "tutor") {
    const tutorId = await getTutorIdByAccount(accountId);
    const result = await pool.query(
      `
      SELECT b.booking_id, b.booking_type, b.session_datetime, b.booking_status, b.escrow_status,
             b.amount_total, b.student_confirmed, b.tutor_confirmed, b.confirmation_status,
             s.name AS student_name, a.email AS student_email
      FROM bookings b
      LEFT JOIN students s ON s.student_id = b.student_id
      LEFT JOIN accounts a ON a.account_id = s.account_id
      WHERE b.tutor_id = $1
      ORDER BY b.created_at DESC
      `,
      [tutorId]
    );
    return result.rows;
  }

  throw new HttpError(403, "FORBIDDEN", "Bookings are available only for student or tutor roles");
}

module.exports = {
  listAvailableTutors,
  getTutorSlots,
  bookTutorSession,
  confirmSession,
  topupStudentWallet,
  getMyBookings,
  FIXED_SLOTS,
};
