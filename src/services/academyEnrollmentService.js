const pool = require("../config/db");
const HttpError = require("../utils/httpError");

const ACADEMY_ENROLLMENT_FEE = Number(process.env.ACADEMY_ENROLLMENT_FEE || 1000);
const DEMO_COURSES = [
  { subject_name: "Mathematics", course_title: "Mathematics Foundation", course_description: "Core math concepts and exam practice", capacity: 30 },
  { subject_name: "Physics", course_title: "Physics Concepts", course_description: "Mechanics, electricity, and numericals", capacity: 25 },
  { subject_name: "Chemistry", course_title: "Chemistry Essentials", course_description: "Organic, inorganic, and practical prep", capacity: 25 },
  { subject_name: "Biology", course_title: "Biology Masterclass", course_description: "Detailed theory and MCQ drills", capacity: 25 },
  { subject_name: "English", course_title: "English Communication", course_description: "Grammar, writing, and spoken practice", capacity: 35 },
  { subject_name: "Computer Science", course_title: "CS Fundamentals", course_description: "Programming basics and logic building", capacity: 30 },
  { subject_name: "Economics", course_title: "Economics Complete", course_description: "Micro and macro economics with examples", capacity: 25 },
  { subject_name: "Business Studies", course_title: "Business Studies Pro", course_description: "Case studies and exam strategies", capacity: 25 },
  { subject_name: "Statistics", course_title: "Statistics and Data", course_description: "Probability, distributions, and data analysis", capacity: 25 },
  { subject_name: "Urdu", course_title: "Urdu Language Skills", course_description: "Reading, writing, and literature coverage", capacity: 30 },
];

async function getStudentIdByAccount(client, accountId) {
  const row = await client.query(`SELECT student_id FROM students WHERE account_id = $1 LIMIT 1`, [accountId]);
  if (row.rowCount === 0) {
    throw new HttpError(404, "STUDENT_PROFILE_NOT_FOUND", "Student profile not found for this account");
  }
  return row.rows[0].student_id;
}

async function ensureStudentWallet(client, studentId) {
  await client.query(
    `INSERT INTO student_wallets (student_id, balance) VALUES ($1, 0) ON CONFLICT (student_id) DO NOTHING`,
    [studentId]
  );
  const wallet = await client.query(`SELECT wallet_id, balance FROM student_wallets WHERE student_id = $1 FOR UPDATE`, [studentId]);
  if (wallet.rowCount === 0) {
    throw new HttpError(500, "STUDENT_WALLET_ERROR", "Failed to load student wallet");
  }
  return wallet.rows[0];
}

async function listSubscribedAcademies() {
  const result = await pool.query(
    `
    SELECT
      ac.academy_id,
      ac.academy_name,
      ac.city,
      ac.country,
      ac.is_verified,
      a.email,
      s.plan_type,
      s.end_at,
      s.end_date
    FROM academies ac
    JOIN accounts a ON a.account_id = ac.account_id
    JOIN subscriptions s
      ON s.academy_id = ac.academy_id
     AND s.is_active = TRUE
     AND (
       (s.end_at IS NOT NULL AND s.end_at > NOW()) OR
       (s.end_at IS NULL AND s.end_date >= CURRENT_DATE)
     )
    ORDER BY ac.academy_id DESC
    `
  );

  return result.rows;
}

async function listAcademyCourses(academyId) {
  const academyCheck = await pool.query(
    `
    SELECT ac.academy_id
    FROM academies ac
    JOIN subscriptions s
      ON s.academy_id = ac.academy_id
     AND s.is_active = TRUE
     AND (
       (s.end_at IS NOT NULL AND s.end_at > NOW()) OR
       (s.end_at IS NULL AND s.end_date >= CURRENT_DATE)
     )
    WHERE ac.academy_id = $1
    LIMIT 1
    `,
    [academyId]
  );

  if (academyCheck.rowCount === 0) {
    throw new HttpError(404, "ACADEMY_NOT_AVAILABLE", "Academy not found or has no active subscription");
  }

  let result = await pool.query(
    `
    SELECT
      c.course_id,
      c.academy_id,
      c.course_title,
      c.course_description,
      c.subject_name,
      c.capacity,
      c.enrolled_count,
      (c.capacity - c.enrolled_count) AS seats_left,
      c.price_per_student
    FROM academy_courses c
    WHERE c.academy_id = $1
    ORDER BY c.course_id DESC
    `,
    [academyId]
  );

  if (result.rowCount === 0) {
    await seedDemoCoursesForAcademyId(academyId);
    result = await pool.query(
      `
      SELECT
        c.course_id,
        c.academy_id,
        c.course_title,
        c.course_description,
        c.subject_name,
        c.capacity,
        c.enrolled_count,
        (c.capacity - c.enrolled_count) AS seats_left,
        c.price_per_student
      FROM academy_courses c
      WHERE c.academy_id = $1
      ORDER BY c.course_id DESC
      `,
      [academyId]
    );
  }

  return result.rows.map((r) => ({
    ...r,
    enrollment_fee: ACADEMY_ENROLLMENT_FEE,
  }));
}

async function seedDemoCoursesForAcademyId(academyId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(`SELECT COUNT(*)::int AS count FROM academy_courses WHERE academy_id = $1`, [academyId]);
    if (existing.rows[0].count > 0) {
      await client.query("COMMIT");
      return { inserted: 0, message: "Courses already exist for academy" };
    }

    for (const item of DEMO_COURSES) {
      await client.query(
        `
        INSERT INTO academy_courses (
          academy_id, teacher_id, subject_id, subject_name, course_title, course_description, price_per_student, capacity, enrolled_count
        )
        VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, 0)
        `,
        [academyId, item.subject_name, item.course_title, item.course_description, ACADEMY_ENROLLMENT_FEE, item.capacity]
      );
    }

    await client.query("COMMIT");
    return { inserted: DEMO_COURSES.length, message: "Demo courses created" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function seedDemoCoursesForAcademyAccount(accountId) {
  const academy = await pool.query(`SELECT academy_id FROM academies WHERE account_id = $1 LIMIT 1`, [accountId]);
  if (academy.rowCount === 0) {
    throw new HttpError(404, "ACADEMY_PROFILE_NOT_FOUND", "Academy profile not found for this account");
  }

  return seedDemoCoursesForAcademyId(academy.rows[0].academy_id);
}

async function enrollInAcademyCourse({ studentAccountId, academyId, courseId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const studentId = await getStudentIdByAccount(client, studentAccountId);
    const studentWallet = await ensureStudentWallet(client, studentId);
    const studentBalanceBefore = Number(studentWallet.balance);

    if (studentBalanceBefore < ACADEMY_ENROLLMENT_FEE) {
      throw new HttpError(409, "INSUFFICIENT_STUDENT_BALANCE", "Insufficient student wallet balance", {
        required: ACADEMY_ENROLLMENT_FEE,
        available: studentBalanceBefore,
      });
    }

    const academyWallet = await client.query(
      `
      SELECT ac.academy_id, w.wallet_id, w.balance
      FROM academies ac
      JOIN wallets w ON w.academy_id = ac.academy_id
      JOIN subscriptions s
        ON s.academy_id = ac.academy_id
       AND s.is_active = TRUE
       AND (
         (s.end_at IS NOT NULL AND s.end_at > NOW()) OR
         (s.end_at IS NULL AND s.end_date >= CURRENT_DATE)
       )
      WHERE ac.academy_id = $1
      LIMIT 1
      FOR UPDATE OF w
      `,
      [academyId]
    );

    if (academyWallet.rowCount === 0) {
      throw new HttpError(404, "ACADEMY_NOT_AVAILABLE", "Academy not found or has no active subscription");
    }

    const course = await client.query(
      `
      SELECT course_id, academy_id, course_title, capacity, enrolled_count
      FROM academy_courses
      WHERE course_id = $1 AND academy_id = $2
      LIMIT 1
      FOR UPDATE
      `,
      [courseId, academyId]
    );

    if (course.rowCount === 0) {
      throw new HttpError(404, "COURSE_NOT_FOUND", "Course not found in selected academy");
    }

    const c = course.rows[0];
    if (Number(c.enrolled_count) >= Number(c.capacity)) {
      throw new HttpError(409, "COURSE_FULL", "No seat left in selected course");
    }

    const duplicate = await client.query(
      `
      SELECT enrollment_id
      FROM academy_enrollments
      WHERE student_id = $1 AND course_id = $2 AND status = 'enrolled'
      LIMIT 1
      `,
      [studentId, courseId]
    );

    if (duplicate.rowCount > 0) {
      throw new HttpError(409, "ALREADY_ENROLLED", "Student is already enrolled in this course");
    }

    const enrollment = await client.query(
      `
      INSERT INTO academy_enrollments (
        student_id, academy_id, course_id, amount_paid, status, enrolled_at
      )
      VALUES ($1, $2, $3, $4, 'enrolled', NOW())
      RETURNING enrollment_id, student_id, academy_id, course_id, amount_paid, status, enrolled_at
      `,
      [studentId, academyId, courseId, ACADEMY_ENROLLMENT_FEE]
    );

    const enrollmentId = enrollment.rows[0].enrollment_id;

    await client.query(
      `
      INSERT INTO academy_enrollment_payments (
        enrollment_id, amount_total, currency, payment_method, payment_status, paid_at, transaction_reference
      )
      VALUES ($1, $2, 'PKR', 'student_wallet', 'completed', NOW(), $3)
      `,
      [enrollmentId, ACADEMY_ENROLLMENT_FEE, `ENR-${enrollmentId}-${Date.now()}`]
    );

    await client.query(`UPDATE academy_courses SET enrolled_count = enrolled_count + 1 WHERE course_id = $1`, [courseId]);

    const studentWalletAfter = await client.query(
      `UPDATE student_wallets SET balance = balance - $1 WHERE wallet_id = $2 RETURNING balance`,
      [ACADEMY_ENROLLMENT_FEE, studentWallet.wallet_id]
    );

    const academyWalletAfter = await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE wallet_id = $2 RETURNING balance`,
      [ACADEMY_ENROLLMENT_FEE, academyWallet.rows[0].wallet_id]
    );

    await client.query("COMMIT");

    return {
      enrollment: enrollment.rows[0],
      payment: {
        amount_total: ACADEMY_ENROLLMENT_FEE,
        currency: "PKR",
        payment_status: "completed",
      },
      student_wallet: {
        wallet_id: studentWallet.wallet_id,
        balance_before: studentBalanceBefore,
        balance_after: Number(studentWalletAfter.rows[0].balance),
      },
      academy_wallet: {
        wallet_id: academyWallet.rows[0].wallet_id,
        balance_after: Number(academyWalletAfter.rows[0].balance),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getMyEnrollments(accountId, role) {
  if (role === "student") {
    const student = await pool.query(`SELECT student_id FROM students WHERE account_id = $1 LIMIT 1`, [accountId]);
    if (student.rowCount === 0) {
      throw new HttpError(404, "STUDENT_PROFILE_NOT_FOUND", "Student profile not found for this account");
    }
    const result = await pool.query(
      `
      SELECT
        e.enrollment_id,
        e.amount_paid,
        e.status,
        e.enrolled_at,
        c.course_id,
        c.course_title,
        c.subject_name,
        ac.academy_id,
        ac.academy_name
      FROM academy_enrollments e
      JOIN academy_courses c ON c.course_id = e.course_id
      JOIN academies ac ON ac.academy_id = e.academy_id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
      `,
      [student.rows[0].student_id]
    );
    return result.rows;
  }

  if (role === "academy") {
    const academy = await pool.query(`SELECT academy_id FROM academies WHERE account_id = $1 LIMIT 1`, [accountId]);
    if (academy.rowCount === 0) {
      throw new HttpError(404, "ACADEMY_PROFILE_NOT_FOUND", "Academy profile not found for this account");
    }
    const result = await pool.query(
      `
      SELECT
        e.enrollment_id,
        e.amount_paid,
        e.status,
        e.enrolled_at,
        c.course_id,
        c.course_title,
        c.subject_name,
        s.student_id,
        s.name AS student_name,
        a.email AS student_email
      FROM academy_enrollments e
      JOIN academy_courses c ON c.course_id = e.course_id
      JOIN students s ON s.student_id = e.student_id
      JOIN accounts a ON a.account_id = s.account_id
      WHERE e.academy_id = $1
      ORDER BY e.enrolled_at DESC
      `,
      [academy.rows[0].academy_id]
    );
    return result.rows;
  }

  throw new HttpError(403, "FORBIDDEN", "Enrollments are available only for student or academy");
}

module.exports = {
  listSubscribedAcademies,
  listAcademyCourses,
  seedDemoCoursesForAcademyAccount,
  enrollInAcademyCourse,
  getMyEnrollments,
  ACADEMY_ENROLLMENT_FEE,
};
