DROP INDEX IF EXISTS idx_tutors_verified;
DROP INDEX IF EXISTS idx_tutors_admin;
DROP INDEX IF EXISTS idx_tutor_subjects_subject;
DROP INDEX IF EXISTS idx_reviews_status;
DROP INDEX IF EXISTS idx_bookings_status;
EXPLAIN ANALYZE
SELECT
    t.tutor_id,
    t.name,
    t.city,
    t.teaching_mode,
    STRING_AGG(DISTINCT s.subject_name || ' (' || s.level || ')', ', ') AS subjects,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(DISTINCT b.booking_id) AS total_sessions
FROM tutors t
LEFT JOIN tutor_subjects ts ON ts.tutor_id = t.tutor_id
LEFT JOIN subjects s ON s.subject_id = ts.subject_id
LEFT JOIN bookings b ON b.tutor_id = t.tutor_id AND b.booking_status = 'completed'
LEFT JOIN reviews r ON r.booking_id = b.booking_id AND r.status = 'approved'
WHERE t.is_verified = TRUE
  AND t.city = 'Lahore'
  AND t.teaching_mode IN ('online', 'hybrid')
GROUP BY t.tutor_id, t.name, t.city, t.teaching_mode
ORDER BY avg_rating DESC NULLS LAST;

CREATE INDEX idx_tutors_verified        ON tutors(is_verified);
CREATE INDEX idx_tutors_city_mode       ON tutors(city, teaching_mode);
CREATE INDEX idx_tutor_subjects_subject ON tutor_subjects(subject_id);
CREATE INDEX idx_reviews_status         ON reviews(status);
CREATE INDEX idx_bookings_status        ON bookings(booking_status);

EXPLAIN ANALYZE
SELECT
    t.tutor_id,
    t.name,
    t.city,
    t.teaching_mode,
    STRING_AGG(DISTINCT s.subject_name || ' (' || s.level || ')', ', ') AS subjects,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(DISTINCT b.booking_id) AS total_sessions
FROM tutors t
LEFT JOIN tutor_subjects ts ON ts.tutor_id = t.tutor_id
LEFT JOIN subjects s ON s.subject_id = ts.subject_id
LEFT JOIN bookings b ON b.tutor_id = t.tutor_id AND b.booking_status = 'completed'
LEFT JOIN reviews r ON r.booking_id = b.booking_id AND r.status = 'approved'
WHERE t.is_verified = TRUE
  AND t.city = 'Lahore'
  AND t.teaching_mode IN ('online', 'hybrid')
GROUP BY t.tutor_id, t.name, t.city, t.teaching_mode
ORDER BY avg_rating DESC NULLS LAST;

DROP INDEX IF EXISTS idx_bookings_student;
DROP INDEX IF EXISTS idx_payments_booking;

EXPLAIN ANALYZE
SELECT
    b.booking_id,
    b.booking_type,
    b.session_datetime,
    b.booking_status,
    b.amount_total,
    t.name AS tutor_name,
    acad.academy_name,
    p.payment_status,
    p.payment_method,
    p.escrow_status,
    p.paid_at
FROM bookings b
LEFT JOIN tutors t ON t.tutor_id = b.tutor_id
LEFT JOIN academies acad ON acad.academy_id = b.academy_id
LEFT JOIN payments p ON p.booking_id = b.booking_id
WHERE b.student_id = 1
ORDER BY b.created_at DESC;

CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);

EXPLAIN ANALYZE
SELECT
    b.booking_id,
    b.booking_type,
    b.session_datetime,
    b.booking_status,
    b.amount_total,
    t.name AS tutor_name,
    acad.academy_name,
    p.payment_status,
    p.payment_method,
    p.escrow_status,
    p.paid_at
FROM bookings b
LEFT JOIN tutors t ON t.tutor_id = b.tutor_id
LEFT JOIN academies acad ON acad.academy_id = b.academy_id
LEFT JOIN payments p ON p.booking_id = b.booking_id
WHERE b.student_id = 1
ORDER BY b.created_at DESC;

DROP INDEX IF EXISTS idx_withdrawal_status;
DROP INDEX IF EXISTS idx_withdrawal_wallet;
DROP INDEX IF EXISTS idx_wallets_tutor;

EXPLAIN ANALYZE
SELECT
    wr.withdrawal_id,
    wr.amount,
    wr.status,
    wr.requested_at,
    w.balance AS current_wallet_balance,
    t.name AS tutor_name,
    a.email AS tutor_email,
    adm.name AS assigned_admin
FROM withdrawal_requests wr
JOIN wallets w ON w.wallet_id = wr.wallet_id
LEFT JOIN tutors t ON t.tutor_id = w.tutor_id
LEFT JOIN accounts a ON a.account_id = t.account_id
LEFT JOIN admins adm ON adm.admin_id = wr.admin_id
WHERE wr.status = 'pending'
ORDER BY wr.requested_at ASC;

CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX idx_wallets_tutor     ON wallets(tutor_id);

EXPLAIN ANALYZE
SELECT
    wr.withdrawal_id,
    wr.amount,
    wr.status,
    wr.requested_at,
    w.balance AS current_wallet_balance,
    t.name AS tutor_name,
    a.email AS tutor_email,
    adm.name AS assigned_admin
FROM withdrawal_requests wr
JOIN wallets w ON w.wallet_id = wr.wallet_id
LEFT JOIN tutors t ON t.tutor_id = w.tutor_id
LEFT JOIN accounts a ON a.account_id = t.account_id
LEFT JOIN admins adm ON adm.admin_id = wr.admin_id
WHERE wr.status = 'pending'
ORDER BY wr.requested_at ASC;

DROP INDEX IF EXISTS idx_student_progress_student;
DROP INDEX IF EXISTS idx_progress_quizzes_progress;
DROP INDEX IF EXISTS idx_progress_quizzes_period;

EXPLAIN ANALYZE
SELECT
    sp.progress_id,
    st.name AS student_name,
    sub.subject_name,
    sub.level,
    sp.current_level,
    sp.average_score,
    sp.trend,
    sp.last_quiz_date,
    COUNT(pq.quiz_id) AS total_quizzes,
    MAX(pq.score_percent) AS best_score,
    MIN(pq.score_percent) AS lowest_score
FROM student_progress sp
JOIN students st ON st.student_id = sp.student_id
JOIN subjects sub ON sub.subject_id = sp.subject_id
LEFT JOIN progress_quizzes pq ON pq.progress_id = sp.progress_id
WHERE sp.student_id = 1
GROUP BY sp.progress_id, st.name, sub.subject_name, sub.level,
         sp.current_level, sp.average_score, sp.trend, sp.last_quiz_date
ORDER BY sp.last_quiz_date DESC;

CREATE INDEX idx_student_progress_student ON student_progress(student_id);
CREATE INDEX idx_progress_quizzes_progress ON progress_quizzes(progress_id);
CREATE INDEX idx_progress_quizzes_period ON progress_quizzes(quiz_year, quiz_month, quiz_number_in_month);

EXPLAIN ANALYZE
SELECT
    sp.progress_id,
    st.name AS student_name,
    sub.subject_name,
    sub.level,
    sp.current_level,
    sp.average_score,
    sp.trend,
    sp.last_quiz_date,
    COUNT(pq.quiz_id) AS total_quizzes,
    MAX(pq.score_percent) AS best_score,
    MIN(pq.score_percent) AS lowest_score
FROM student_progress sp
JOIN students st ON st.student_id = sp.student_id
JOIN subjects sub ON sub.subject_id = sp.subject_id
LEFT JOIN progress_quizzes pq ON pq.progress_id = sp.progress_id
WHERE sp.student_id = 1
GROUP BY sp.progress_id, st.name, sub.subject_name, sub.level,
         sp.current_level, sp.average_score, sp.trend, sp.last_quiz_date
ORDER BY sp.last_quiz_date DESC;