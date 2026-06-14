const pool = require("../config/db");
const HttpError = require("../utils/httpError");

async function getStudentIdByAccount(client, accountId) {
  const result = await client.query(`SELECT student_id FROM students WHERE account_id = $1 LIMIT 1`, [accountId]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "STUDENT_PROFILE_NOT_FOUND", "Student profile not found for this account");
  }
  return result.rows[0].student_id;
}

async function getTutorIdByAccount(client, accountId) {
  const result = await client.query(`SELECT tutor_id FROM tutors WHERE account_id = $1 LIMIT 1`, [accountId]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "TUTOR_PROFILE_NOT_FOUND", "Tutor profile not found for this account");
  }
  return result.rows[0].tutor_id;
}

async function createReview({ studentAccountId, bookingId, rating, comment }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const studentId = await getStudentIdByAccount(client, studentAccountId);
    const bookingResult = await client.query(
      `
      SELECT
        b.booking_id,
        b.student_id,
        b.tutor_id,
        b.booking_type,
        b.booking_status,
        b.escrow_status,
        b.confirmation_status
      FROM bookings b
      WHERE b.booking_id = $1
      FOR UPDATE
      `,
      [bookingId]
    );

    if (bookingResult.rowCount === 0) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }

    const booking = bookingResult.rows[0];
    if (Number(booking.student_id) !== Number(studentId)) {
      throw new HttpError(403, "FORBIDDEN", "This booking does not belong to student");
    }

    if (booking.booking_type !== "tutor" || !booking.tutor_id) {
      throw new HttpError(400, "REVIEW_NOT_ALLOWED", "Reviews are only allowed for tutor sessions");
    }

    if (
      booking.booking_status !== "completed" ||
      booking.escrow_status !== "released" ||
      booking.confirmation_status !== "confirmed_by_both"
    ) {
      throw new HttpError(409, "SESSION_NOT_COMPLETED", "Review can be submitted only after completed session");
    }

    const existing = await client.query(`SELECT review_id FROM reviews WHERE booking_id = $1 LIMIT 1`, [bookingId]);
    if (existing.rowCount > 0) {
      throw new HttpError(409, "REVIEW_ALREADY_EXISTS", "Review already submitted for this booking");
    }

    const inserted = await client.query(
      `
      INSERT INTO reviews (booking_id, rating, comment, status, created_at)
      VALUES ($1, $2, $3, 'approved', NOW())
      RETURNING review_id, booking_id, rating, comment, status, created_at
      `,
      [bookingId, rating, comment || null]
    );

    const aggregate = await client.query(
      `
      SELECT
        ROUND(AVG(r.rating)::numeric, 2) AS average_rating,
        COUNT(*)::int AS total_reviews
      FROM reviews r
      JOIN bookings b ON b.booking_id = r.booking_id
      WHERE b.tutor_id = $1
        AND r.status = 'approved'
      `,
      [booking.tutor_id]
    );

    await client.query("COMMIT");
    return {
      review: inserted.rows[0],
      tutor_rating: {
        tutor_id: Number(booking.tutor_id),
        average_rating: Number(aggregate.rows[0].average_rating || 0),
        total_reviews: Number(aggregate.rows[0].total_reviews || 0),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getMyReviews(accountId, role) {
  if (role === "student") {
    const result = await pool.query(
      `
      SELECT
        r.review_id,
        r.booking_id,
        r.rating,
        r.comment,
        r.status,
        r.created_at,
        t.tutor_id,
        t.name AS tutor_name
      FROM reviews r
      JOIN bookings b ON b.booking_id = r.booking_id
      JOIN students s ON s.student_id = b.student_id
      LEFT JOIN tutors t ON t.tutor_id = b.tutor_id
      WHERE s.account_id = $1
      ORDER BY r.created_at DESC
      `,
      [accountId]
    );
    return result.rows;
  }

  if (role === "tutor") {
    const result = await pool.query(
      `
      SELECT
        r.review_id,
        r.booking_id,
        r.rating,
        r.comment,
        r.status,
        r.created_at,
        s.student_id,
        s.name AS student_name
      FROM reviews r
      JOIN bookings b ON b.booking_id = r.booking_id
      JOIN tutors t ON t.tutor_id = b.tutor_id
      LEFT JOIN students s ON s.student_id = b.student_id
      WHERE t.account_id = $1
      ORDER BY r.created_at DESC
      `,
      [accountId]
    );

    const summary = await pool.query(
      `
      SELECT
        ROUND(AVG(r.rating)::numeric, 2) AS average_rating,
        COUNT(*)::int AS total_reviews
      FROM reviews r
      JOIN bookings b ON b.booking_id = r.booking_id
      JOIN tutors t ON t.tutor_id = b.tutor_id
      WHERE t.account_id = $1
        AND r.status = 'approved'
      `,
      [accountId]
    );

    return {
      reviews: result.rows,
      rating_summary: {
        average_rating: Number(summary.rows[0].average_rating || 0),
        total_reviews: Number(summary.rows[0].total_reviews || 0),
      },
    };
  }

  throw new HttpError(403, "FORBIDDEN", "Reviews are available only for student or tutor roles");
}

module.exports = {
  createReview,
  getMyReviews,
};
