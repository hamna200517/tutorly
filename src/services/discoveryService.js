const pool = require("../config/db");

const SESSION_PRICE = Number(process.env.SESSION_PRICE || 1000);

function normalizePagination(limit, offset) {
  return {
    limit: Number.isFinite(Number(limit)) ? Number(limit) : 20,
    offset: Number.isFinite(Number(offset)) ? Number(offset) : 0,
  };
}

async function discoverTutors(filters) {
  const { subject, location, teaching_mode, min_rating, min_price, max_price } = filters;
  const { limit, offset } = normalizePagination(filters.limit, filters.offset);

  if ((min_price !== undefined && SESSION_PRICE < min_price) || (max_price !== undefined && SESSION_PRICE > max_price)) {
    return [];
  }

  const params = [];
  const where = [
    "atm.membership_id IS NULL",
    "sub.is_active = TRUE",
    "((sub.end_at IS NOT NULL AND sub.end_at > NOW()) OR (sub.end_at IS NULL AND sub.end_date >= CURRENT_DATE))",
  ];
  const having = [];

  if (location) {
    params.push(`%${location}%`);
    where.push(`(t.city ILIKE $${params.length} OR t.country ILIKE $${params.length})`);
  }

  if (teaching_mode) {
    params.push(teaching_mode);
    where.push(`t.teaching_mode = $${params.length}`);
  }

  if (subject) {
    params.push(`%${subject}%`);
    where.push(`
      EXISTS (
        SELECT 1
        FROM tutor_subjects ts2
        JOIN subjects s2 ON s2.subject_id = ts2.subject_id
        WHERE ts2.tutor_id = t.tutor_id
          AND s2.subject_name ILIKE $${params.length}
      )
    `);
  }

  if (min_rating !== undefined) {
    params.push(min_rating);
    having.push(`COALESCE(AVG(r.rating), 0) >= $${params.length}`);
  }

  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const result = await pool.query(
    `
    SELECT
      t.tutor_id,
      t.name,
      t.city,
      t.country,
      t.teaching_mode,
      t.bio,
      t.education_level,
      t.is_verified,
      a.email,
      ROUND(COALESCE(AVG(r.rating), 0)::numeric, 2) AS average_rating,
      COUNT(r.review_id)::int AS total_reviews,
      ${SESSION_PRICE}::numeric AS price_per_session,
      COALESCE(STRING_AGG(DISTINCT (s.subject_name || ' (' || s.level || ')'), ', '), '') AS subjects
    FROM tutors t
    JOIN accounts a ON a.account_id = t.account_id
    LEFT JOIN academy_tutor_members atm
      ON atm.tutor_id = t.tutor_id AND atm.is_active = TRUE
    JOIN subscriptions sub
      ON sub.tutor_id = t.tutor_id
    LEFT JOIN tutor_subjects ts ON ts.tutor_id = t.tutor_id
    LEFT JOIN subjects s ON s.subject_id = ts.subject_id
    LEFT JOIN bookings b ON b.tutor_id = t.tutor_id AND b.booking_status = 'completed'
    LEFT JOIN reviews r ON r.booking_id = b.booking_id AND r.status = 'approved'
    WHERE ${where.join(" AND ")}
    GROUP BY t.tutor_id, a.email
    ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
    ORDER BY average_rating DESC, total_reviews DESC, t.tutor_id DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    params
  );

  return result.rows.map((row) => ({
    ...row,
    average_rating: Number(row.average_rating || 0),
    total_reviews: Number(row.total_reviews || 0),
    price_per_session: Number(row.price_per_session || SESSION_PRICE),
  }));
}

async function discoverAcademies(filters) {
  const { subject, location, min_rating, min_price, max_price } = filters;
  const { limit, offset } = normalizePagination(filters.limit, filters.offset);

  const params = [];
  const where = [
    "sub.is_active = TRUE",
    "((sub.end_at IS NOT NULL AND sub.end_at > NOW()) OR (sub.end_at IS NULL AND sub.end_date >= CURRENT_DATE))",
  ];
  const having = [];

  if (location) {
    params.push(`%${location}%`);
    where.push(`(ac.city ILIKE $${params.length} OR ac.country ILIKE $${params.length})`);
  }

  if (subject) {
    params.push(`%${subject}%`);
    where.push(`
      EXISTS (
        SELECT 1
        FROM academy_courses c2
        WHERE c2.academy_id = ac.academy_id
          AND c2.subject_name ILIKE $${params.length}
      )
    `);
  }

  if (min_rating !== undefined) {
    params.push(min_rating);
    having.push(`COALESCE(AVG(r.rating), 0) >= $${params.length}`);
  }

  if (min_price !== undefined) {
    params.push(min_price);
    having.push(`COALESCE(MIN(c.price_per_student), 0) >= $${params.length}`);
  }

  if (max_price !== undefined) {
    params.push(max_price);
    having.push(`COALESCE(MIN(c.price_per_student), 0) <= $${params.length}`);
  }

  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const result = await pool.query(
    `
    SELECT
      ac.academy_id,
      ac.academy_name,
      ac.city,
      ac.country,
      ac.description,
      ac.is_verified,
      a.email,
      ROUND(COALESCE(AVG(r.rating), 0)::numeric, 2) AS average_rating,
      COUNT(r.review_id)::int AS total_reviews,
      COALESCE(MIN(c.price_per_student), 0)::numeric AS min_price,
      COUNT(DISTINCT c.course_id)::int AS courses_count,
      COALESCE(STRING_AGG(DISTINCT c.subject_name, ', '), '') AS subjects
    FROM academies ac
    JOIN accounts a ON a.account_id = ac.account_id
    JOIN subscriptions sub ON sub.academy_id = ac.academy_id
    LEFT JOIN academy_courses c ON c.academy_id = ac.academy_id
    LEFT JOIN bookings b
      ON b.academy_id = ac.academy_id
     AND b.booking_type = 'academy'
     AND b.booking_status = 'completed'
    LEFT JOIN reviews r ON r.booking_id = b.booking_id AND r.status = 'approved'
    WHERE ${where.join(" AND ")}
    GROUP BY ac.academy_id, a.email
    ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
    ORDER BY average_rating DESC, total_reviews DESC, ac.academy_id DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    params
  );

  return result.rows.map((row) => ({
    ...row,
    average_rating: Number(row.average_rating || 0),
    total_reviews: Number(row.total_reviews || 0),
    min_price: Number(row.min_price || 0),
    courses_count: Number(row.courses_count || 0),
  }));
}

module.exports = {
  discoverTutors,
  discoverAcademies,
};
