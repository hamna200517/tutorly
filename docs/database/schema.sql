CREATE TABLE accounts (
    account_id    SERIAL PRIMARY KEY,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('student','tutor','academy','admin')),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    is_active     BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_accounts_role ON accounts(role);

CREATE TABLE admins (
    admin_id   SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(account_id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL
);

CREATE INDEX idx_admins_account ON admins(account_id);

CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(account_id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    city       VARCHAR(100),
    country    VARCHAR(100),
    phone      VARCHAR(20)
);

CREATE INDEX idx_students_account ON students(account_id);

CREATE TABLE tutors (
    tutor_id             SERIAL PRIMARY KEY,
    account_id           INTEGER NOT NULL UNIQUE REFERENCES accounts(account_id) ON DELETE CASCADE,
    verified_by_admin_id INTEGER REFERENCES admins(admin_id),
    name                 VARCHAR(100) NOT NULL,
    bio                  TEXT,
    education_level      VARCHAR(100),
    city                 VARCHAR(100),
    country              VARCHAR(100),
    is_verified          BOOLEAN DEFAULT FALSE,
    education_history    TEXT,
    work_history         TEXT,
    teaching_mode        VARCHAR(20) CHECK (teaching_mode IN ('online','physical','hybrid')),
    profile_picture_url  VARCHAR(500)
);

CREATE INDEX idx_tutors_account  ON tutors(account_id);
CREATE INDEX idx_tutors_verified ON tutors(is_verified);
CREATE INDEX idx_tutors_admin    ON tutors(verified_by_admin_id);

CREATE TABLE academies (
    academy_id           SERIAL PRIMARY KEY,
    account_id           INTEGER NOT NULL UNIQUE REFERENCES accounts(account_id) ON DELETE CASCADE,
    verified_by_admin_id INTEGER REFERENCES admins(admin_id),
    academy_name         VARCHAR(200) NOT NULL,
    description          TEXT,
    logo_url             VARCHAR(500),
    city                 VARCHAR(100),
    country              VARCHAR(100),
    is_verified          BOOLEAN DEFAULT FALSE,
    about                TEXT,
    founded_year         INTEGER,
    owner_name           VARCHAR(100)
);

CREATE INDEX idx_academies_account  ON academies(account_id);
CREATE INDEX idx_academies_verified ON academies(is_verified);
CREATE INDEX idx_academies_admin    ON academies(verified_by_admin_id);

CREATE TABLE subjects (
    subject_id   SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL,
    level        VARCHAR(50) NOT NULL CHECK (level IN ('O Level','A Level','Primary','University','Other')),
    UNIQUE (subject_name, level)
);

CREATE INDEX idx_subjects_name ON subjects(subject_name);

CREATE TABLE tutor_subjects (
    tutor_id   INTEGER NOT NULL REFERENCES tutors(tutor_id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
    PRIMARY KEY (tutor_id, subject_id)
);

CREATE INDEX idx_tutor_subjects_subject ON tutor_subjects(subject_id);

CREATE TABLE academy_teachers (
    teacher_id    SERIAL PRIMARY KEY,
    academy_id    INTEGER NOT NULL REFERENCES academies(academy_id) ON DELETE CASCADE,
    teacher_name  VARCHAR(100) NOT NULL,
    qualification VARCHAR(200),
    subject_id    INTEGER REFERENCES subjects(subject_id)
);

CREATE INDEX idx_academy_teachers_academy ON academy_teachers(academy_id);

CREATE TABLE academy_courses (
    course_id          SERIAL PRIMARY KEY,
    academy_id         INTEGER NOT NULL REFERENCES academies(academy_id) ON DELETE CASCADE,
    teacher_id         INTEGER REFERENCES academy_teachers(teacher_id),
    subject_id         INTEGER REFERENCES subjects(subject_id),
    subject_name       VARCHAR(100),
    course_title       VARCHAR(200) NOT NULL,
    course_description TEXT,
    price_per_student  DECIMAL(10,2) NOT NULL CHECK (price_per_student >= 0),
    capacity           INTEGER NOT NULL CHECK (capacity > 0),
    enrolled_count     INTEGER DEFAULT 0 CHECK (enrolled_count >= 0)
);

CREATE INDEX idx_academy_courses_academy ON academy_courses(academy_id);
CREATE INDEX idx_academy_courses_teacher ON academy_courses(teacher_id);
CREATE INDEX idx_academy_courses_subject ON academy_courses(subject_id);

CREATE TABLE course_schedule (
    schedule_id SERIAL PRIMARY KEY,
    course_id   INTEGER NOT NULL REFERENCES academy_courses(course_id) ON DELETE CASCADE,
    weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    CHECK (end_time > start_time)
);

CREATE INDEX idx_course_schedule_course ON course_schedule(course_id);

CREATE TABLE tutor_calendars (
    calendar_id   SERIAL PRIMARY KEY,
    tutor_id      INTEGER NOT NULL REFERENCES tutors(tutor_id) ON DELETE CASCADE,
    calendar_name VARCHAR(100) NOT NULL
);

CREATE INDEX idx_tutor_calendars_tutor ON tutor_calendars(tutor_id);

CREATE TABLE available_slots (
    slot_id     SERIAL PRIMARY KEY,
    calendar_id INTEGER NOT NULL REFERENCES tutor_calendars(calendar_id) ON DELETE CASCADE,
    weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    CHECK (end_time > start_time)
);

CREATE INDEX idx_available_slots_calendar ON available_slots(calendar_id);

CREATE TABLE bookings (
    booking_id              SERIAL PRIMARY KEY,
    student_id              INTEGER NOT NULL REFERENCES students(student_id),
    tutor_id                INTEGER REFERENCES tutors(tutor_id),
    academy_id              INTEGER REFERENCES academies(academy_id),
    course_id               INTEGER REFERENCES academy_courses(course_id),
    admin_id                INTEGER REFERENCES admins(admin_id),
    session_datetime        TIMESTAMP,
    amount_total            DECIMAL(10,2) CHECK (amount_total >= 0),
    tutor_or_academy_amount DECIMAL(10,2) CHECK (tutor_or_academy_amount >= 0),
    commission_amount       DECIMAL(10,2) CHECK (commission_amount >= 0),
    booking_type            VARCHAR(20) NOT NULL CHECK (booking_type IN ('tutor','academy')),
    booking_status          VARCHAR(20) DEFAULT 'pending' CHECK (booking_status IN ('pending','confirmed','cancelled','completed')),
    escrow_status           VARCHAR(20) DEFAULT 'held' CHECK (escrow_status IN ('held','released','refunded')),
    created_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_tutor   ON bookings(tutor_id);
CREATE INDEX idx_bookings_academy ON bookings(academy_id);
CREATE INDEX idx_bookings_status  ON bookings(booking_status);

CREATE TABLE booked_slots (
    booked_slot_id SERIAL PRIMARY KEY,
    calendar_id    INTEGER NOT NULL REFERENCES tutor_calendars(calendar_id) ON DELETE CASCADE,
    booking_id     INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    status         VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed'))
);

CREATE INDEX idx_booked_slots_calendar ON booked_slots(calendar_id);
CREATE INDEX idx_booked_slots_booking  ON booked_slots(booking_id);

CREATE TABLE payments (
    payment_id              SERIAL PRIMARY KEY,
    booking_id              INTEGER NOT NULL UNIQUE REFERENCES bookings(booking_id),
    admin_id                INTEGER REFERENCES admins(admin_id),
    amount_total            DECIMAL(10,2) NOT NULL CHECK (amount_total >= 0),
    tutor_or_academy_amount DECIMAL(10,2) NOT NULL CHECK (tutor_or_academy_amount >= 0),
    commission_amount       DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0),
    platform_fee            DECIMAL(10,2) DEFAULT 0 CHECK (platform_fee >= 0),
    currency                VARCHAR(10) DEFAULT 'PKR',
    payment_method          VARCHAR(50),
    payment_status          VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','refunded')),
    escrow_status           VARCHAR(20) DEFAULT 'held' CHECK (escrow_status IN ('held','released','refunded')),
    transaction_reference   VARCHAR(200),
    paid_at                 TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status  ON payments(payment_status);
CREATE INDEX idx_payments_escrow  ON payments(escrow_status);
CREATE INDEX idx_payments_admin   ON payments(admin_id);

CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    tutor_id        INTEGER REFERENCES tutors(tutor_id),
    academy_id      INTEGER REFERENCES academies(academy_id),
    plan_type       VARCHAR(20) NOT NULL CHECK (plan_type IN ('1m','3m','1y')),
    start_at        TIMESTAMP,
    end_at          TIMESTAMP,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    CHECK (end_at IS NULL OR start_at IS NULL OR end_at > start_at),
    CHECK (end_date > start_date)
);

CREATE INDEX idx_subscriptions_tutor   ON subscriptions(tutor_id);
CREATE INDEX idx_subscriptions_academy ON subscriptions(academy_id);
CREATE INDEX idx_subscriptions_active  ON subscriptions(is_active);

CREATE TABLE wallets (
    wallet_id  SERIAL PRIMARY KEY,
    tutor_id   INTEGER UNIQUE REFERENCES tutors(tutor_id),
    academy_id INTEGER UNIQUE REFERENCES academies(academy_id),
    balance    DECIMAL(12,2) DEFAULT 0 CHECK (balance >= 0)
);

CREATE INDEX idx_wallets_tutor   ON wallets(tutor_id);
CREATE INDEX idx_wallets_academy ON wallets(academy_id);

CREATE TABLE withdrawal_requests (
    withdrawal_id SERIAL PRIMARY KEY,
    wallet_id     INTEGER NOT NULL REFERENCES wallets(wallet_id),
    admin_id      INTEGER REFERENCES admins(admin_id),
    amount        DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    requested_at  TIMESTAMP DEFAULT NOW(),
    processed_at  TIMESTAMP
);

CREATE INDEX idx_withdrawal_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_admin  ON withdrawal_requests(admin_id);

CREATE TABLE messages (
    message_id          SERIAL PRIMARY KEY,
    sender_account_id   INTEGER NOT NULL REFERENCES accounts(account_id),
    receiver_account_id INTEGER NOT NULL REFERENCES accounts(account_id),
    content             TEXT NOT NULL,
    sent_at             TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_sender   ON messages(sender_account_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_account_id);

CREATE TABLE help_requests (
    ticket_id          SERIAL PRIMARY KEY,
    creator_account_id INTEGER NOT NULL REFERENCES accounts(account_id),
    admin_id           INTEGER REFERENCES admins(admin_id),
    title              VARCHAR(200) NOT NULL,
    description        TEXT NOT NULL,
    status             VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    created_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_help_requests_creator ON help_requests(creator_account_id);
CREATE INDEX idx_help_requests_admin   ON help_requests(admin_id);
CREATE INDEX idx_help_requests_status  ON help_requests(status);

CREATE TABLE reviews (
    review_id  SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(booking_id),
    rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    status     VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_status  ON reviews(status);

CREATE TABLE student_progress (
    progress_id    SERIAL PRIMARY KEY,
    student_id     INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    subject_id     INTEGER NOT NULL REFERENCES subjects(subject_id),
    current_level  VARCHAR(50),
    average_score  DECIMAL(5,2),
    trend          VARCHAR(20) CHECK (trend IN ('improving','stable','declining')),
    last_quiz_date DATE,
    notes          TEXT,
    UNIQUE (student_id, subject_id)
);

CREATE INDEX idx_student_progress_student ON student_progress(student_id);
CREATE INDEX idx_student_progress_subject ON student_progress(subject_id);

CREATE TABLE progress_quizzes (
    quiz_id              SERIAL PRIMARY KEY,
    progress_id          INTEGER NOT NULL REFERENCES student_progress(progress_id) ON DELETE CASCADE,
    quiz_month           SMALLINT NOT NULL CHECK (quiz_month BETWEEN 1 AND 12),
    quiz_year            INTEGER NOT NULL,
    quiz_number_in_month SMALLINT NOT NULL CHECK (quiz_number_in_month IN (1,2)),
    total_questions      INTEGER NOT NULL CHECK (total_questions > 0),
    correct_answers      INTEGER NOT NULL CHECK (correct_answers >= 0),
    score_percent        DECIMAL(5,2),
    difficulty_level     VARCHAR(20) CHECK (difficulty_level IN ('easy','medium','hard')),
    time_taken_seconds   INTEGER
);

CREATE INDEX idx_progress_quizzes_progress ON progress_quizzes(progress_id);
CREATE INDEX idx_progress_quizzes_period   ON progress_quizzes(quiz_year, quiz_month, quiz_number_in_month);

CREATE OR REPLACE FUNCTION fn_calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.amount_total IS NOT NULL THEN
        NEW.commission_amount := ROUND(NEW.amount_total * 0.10, 2);
        NEW.tutor_or_academy_amount := NEW.amount_total - NEW.commission_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_commission
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION fn_calculate_commission();

CREATE OR REPLACE FUNCTION fn_auto_create_wallet()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'tutors' THEN
        INSERT INTO wallets (tutor_id, balance) VALUES (NEW.tutor_id, 0) ON CONFLICT DO NOTHING;
    ELSIF TG_TABLE_NAME = 'academies' THEN
        INSERT INTO wallets (academy_id, balance) VALUES (NEW.academy_id, 0) ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tutor_wallet
AFTER INSERT ON tutors
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_wallet();

CREATE TRIGGER trg_academy_wallet
AFTER INSERT ON academies
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_wallet();

CREATE OR REPLACE FUNCTION fn_update_progress_after_quiz()
RETURNS TRIGGER AS $$
DECLARE
    v_avg   DECIMAL(5,2);
    v_last  DECIMAL(5,2);
    v_prev  DECIMAL(5,2);
    v_trend VARCHAR(20);
BEGIN
    SELECT ROUND(AVG(score_percent), 2) INTO v_avg
    FROM progress_quizzes WHERE progress_id = NEW.progress_id;

    SELECT score_percent INTO v_last
    FROM progress_quizzes WHERE progress_id = NEW.progress_id
    ORDER BY quiz_year DESC, quiz_month DESC, quiz_number_in_month DESC LIMIT 1;

    SELECT score_percent INTO v_prev
    FROM progress_quizzes WHERE progress_id = NEW.progress_id
    ORDER BY quiz_year DESC, quiz_month DESC, quiz_number_in_month DESC LIMIT 1 OFFSET 1;

    IF v_prev IS NULL THEN
        v_trend := 'stable';
    ELSIF v_last > v_prev THEN
        v_trend := 'improving';
    ELSIF v_last < v_prev THEN
        v_trend := 'declining';
    ELSE
        v_trend := 'stable';
    END IF;

    UPDATE student_progress
    SET average_score = v_avg, trend = v_trend
    WHERE progress_id = NEW.progress_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_progress
AFTER INSERT ON progress_quizzes
FOR EACH ROW
EXECUTE FUNCTION fn_update_progress_after_quiz();

CREATE OR REPLACE VIEW vw_tutor_profiles AS
SELECT
    t.tutor_id,
    t.name AS tutor_name,
    a.email AS tutor_email,
    t.city,
    t.country,
    t.teaching_mode,
    t.is_verified,
    t.education_level,
    t.bio,
    STRING_AGG(DISTINCT s.subject_name || ' (' || s.level || ')', ', ') AS subjects,
    ROUND(AVG(r.rating), 2) AS average_rating,
    COUNT(DISTINCT r.review_id) AS total_reviews
FROM tutors t
JOIN accounts a ON a.account_id = t.account_id
LEFT JOIN tutor_subjects ts ON ts.tutor_id = t.tutor_id
LEFT JOIN subjects s ON s.subject_id = ts.subject_id
LEFT JOIN bookings b ON b.tutor_id = t.tutor_id AND b.booking_status = 'completed'
LEFT JOIN reviews r ON r.booking_id = b.booking_id AND r.status = 'approved'
GROUP BY t.tutor_id, t.name, a.email, t.city, t.country, t.teaching_mode, t.is_verified, t.education_level, t.bio;

CREATE OR REPLACE VIEW vw_booking_summary AS
SELECT
    b.booking_id,
    b.booking_type,
    b.booking_status,
    b.session_datetime,
    b.amount_total,
    b.created_at,
    st.name AS student_name,
    ac_s.email AS student_email,
    t.name AS tutor_name,
    acad.academy_name,
    p.payment_status,
    p.payment_method,
    p.escrow_status,
    p.paid_at
FROM bookings b
JOIN students st ON st.student_id = b.student_id
JOIN accounts ac_s ON ac_s.account_id = st.account_id
LEFT JOIN tutors t ON t.tutor_id = b.tutor_id
LEFT JOIN academies acad ON acad.academy_id = b.academy_id
LEFT JOIN payments p ON p.booking_id = b.booking_id;

CREATE OR REPLACE VIEW vw_admin_open_tickets AS
SELECT
    hr.ticket_id,
    hr.title,
    hr.status,
    hr.created_at,
    a.email AS creator_email,
    a.role AS creator_role,
    adm.name AS assigned_admin
FROM help_requests hr
JOIN accounts a ON a.account_id = hr.creator_account_id
LEFT JOIN admins adm ON adm.admin_id = hr.admin_id
WHERE hr.status IN ('open','in_progress')
ORDER BY hr.created_at ASC;
