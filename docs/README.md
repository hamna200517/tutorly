
## Project Overview
Tutorly is an educational platform that connects students with tutors and academies. It supports role-based access for students, tutors, academies,. The system addresses practical needs such as tutor discovery, academy course enrollment, wallet-based payments, booking management, withdrawals, chat, and review handling. Its main users include students looking for learning support, tutors offering educational services, academies managing courses and enrollments, and overseeing critical system operations.

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Axios
- Zustand
- TanStack Query
- Recharts
- React Hook Form
- Zod
- CSS

### Backend
- Node.js
- Express.js
- Joi
- RESTful API architecture
- Swagger UI

### Database
- PostgreSQL (hosted on Supabase)

### Authentication
- Supabase Auth
- Bearer token-based protected API access

## System Architecture
The system is divided into three parts:

1. **Frontend**
   - Runs as a separate React application
   - Handles UI, routing, forms, and role-based dashboards
   - Sends authenticated API requests to the backend

2. **Backend**
   - Runs as an Express server
   - Provides REST API endpoints under `/api/v1/...`
   - Handles business logic, RBAC, transactions, escrow, withdrawals, and enrollments

3. **Database**
   - PostgreSQL on Supabase
   - Stores accounts, tutors, students, academies, wallets, subscriptions, bookings, enrollments, reviews, messages, and related records

## UI Examples

### 1. Student Tutor Booking
This page allows a student to discover subscribed tutors, select a date, load available slots, and book a tutor session. It is an important screen because it demonstrates one of the main user journeys of the system.

![Student Tutor Booking](../media/screenshots/student-booking.png)

### 2. Academy Course Management
This page allows an academy to manage its course offerings by adding manual courses, seeding demo courses, viewing the current course list, and deleting courses when no students are enrolled in them. It is required because it represents academy-side course management and supports the project’s CRUD-oriented frontend requirements.

![Academy Course Management](../media/screenshots/academy-courses.png)


## Setup & Installation

### Prerequisites
Before running the project, make sure the following are installed and configured:

- Node.js `18` or later recommended
- npm
- PostgreSQL database access through Supabase
- A Supabase project with:
  - project URL
  - anon key
  - service role key
- Git (optional, if cloning locally)

### Project Structure Used During Development
This project was developed with:
- the backend in the main project directory
- the frontend in the `frontend/` directory

### Backend Installation
Open a terminal in the project root and install backend dependencies using `npm install`.

### Frontend Installation
Open a terminal in the project root, then move to the `frontend/` directory and install frontend dependencies using:
- `cd frontend`
- `npm install`

### Backend Environment Configuration
Create a `.env` file in the project root and configure it with the following values:

- `PORT=4001`
- `SUPABASE_URL=your_supabase_project_url`
- `SUPABASE_ANON_KEY=your_supabase_anon_key`
- `SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key`
- `DATABASE_URL=your_supabase_postgres_connection_string`
- `SESSION_PRICE=1000`
- `SUBSCRIPTION_PRICE_1M=2000`
- `SUBSCRIPTION_PRICE_3M=5000`
- `SUBSCRIPTION_PRICE_1Y=18000`
- `ACADEMY_SUBSCRIPTION_PRICE_1M=20000`
- `TOPUP_MAX_AMOUNT=100000`
- `FRONTEND_URL=http://localhost:5173`
- `SUPABASE_EMAIL_REDIRECT_TO=http://localhost:5173`
- `SUPABASE_PASSWORD_RESET_REDIRECT_TO=http://localhost:5173/reset-password`

#### Backend `.env` Variable Explanation
- `PORT`: port used by the backend server
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: public Supabase anon key used for auth-related operations
- `SUPABASE_SERVICE_ROLE_KEY`: service role key used for privileged backend operations
- `DATABASE_URL`: PostgreSQL connection string for the database
- `SESSION_PRICE`: fixed tutor session booking price
- `SUBSCRIPTION_PRICE_1M`: tutor 1-month subscription cost
- `SUBSCRIPTION_PRICE_3M`: tutor 3-month subscription cost
- `SUBSCRIPTION_PRICE_1Y`: tutor 1-year subscription cost
- `ACADEMY_SUBSCRIPTION_PRICE_1M`: academy monthly subscription cost
- `TOPUP_MAX_AMOUNT`: maximum allowed wallet top-up amount
- `FRONTEND_URL`: frontend base URL
- `SUPABASE_EMAIL_REDIRECT_TO`: redirect URL used for email verification and related redirects
- `SUPABASE_PASSWORD_RESET_REDIRECT_TO`: redirect URL used for password reset links

### Frontend Environment Configuration
Create a `.env` file inside the `frontend/` directory and add:

- `VITE_API_BASE_URL=http://localhost:4001/api/v1`

#### Frontend `.env` Variable Explanation
- `VITE_API_BASE_URL`: base URL for all frontend API requests to the backend

### Database Initialization
The database should be initialized using the provided SQL files in this order:

1. `schema.sql`
2. `seed.sql`
3. `performance.sql` for indexing and performance evaluation only

Recommended order:
- First run `schema.sql` to create tables, constraints, functions, and indexes
- Then run `seed.sql` to insert sample and test data
- Run `performance.sql` when evaluating query optimization and performance

If these SQL files are stored in a specific project folder such as `docs/database/`, run them from there using the same order. If you are using Supabase PostgreSQL, run these SQL files through the SQL Editor or any PostgreSQL-compatible client connected to your database.

### Starting the Backend Server
From the project root, run:
- `npm run dev`

The backend should start on:
- `http://localhost:4001`

Useful backend URLs:
- Root: `http://localhost:4001`
- Health Check: `http://localhost:4001/health`
- API Docs: `http://localhost:4001/api-docs`

### Starting the Frontend Dev Server
From the `frontend/` directory, run:
- `npm run dev`

The frontend should start on:
- `http://localhost:5173`

### Running the Full Project
To use the application properly, both servers must be running at the same time:

1. Start the backend from the project root
2. Start the frontend from the `frontend/` folder
3. Open the frontend in the browser at `http://localhost:5173`

### Notes
- Password reset and email verification flows depend on correct Supabase redirect URL configuration
- In Supabase Auth settings, make sure these redirect URLs are allowed:
  - `http://localhost:5173`
  - `http://localhost:5173/reset-password`

## User Roles

### Student
**Can do:**
- Register and log in
- Top up wallet
- Discover tutors with filters
- Load tutor slots and book sessions
- Confirm tutor sessions
- Discover academies with filters
- View academy courses and enroll
- Chat with tutors and academies
- Submit tutor reviews
- Submit app feedback

**Cannot do:**
- Purchase tutor or academy subscriptions
- Review withdrawal requests

**Testing Accounts**
`seed.sql` contains sample student emails such as:
- `ayesha.khan@gmail.com`
- `bilal.ahmed@gmail.com`
- `chand.bibi@gmail.com`

However, the password values in `seed.sql` are placeholder hashes, not usable plaintext passwords. In practice, testing login should be done with:
- accounts registered through the frontend, or
- manually provisioned Supabase auth users that match the seeded backend emails

---

### Tutor
**Can do:**
- Register and log in
- Top up wallet
- Purchase tutor subscription plans
- View and confirm bookings
- Request withdrawals
- View reviews from students
- Chat with students
- Submit app feedback

**Cannot do:**
- Enroll in academy courses
- Approve withdrawals

**Testing Accounts**
`seed.sql` contains sample tutor emails such as:
- `ali.hassan@tutorly.pk`
- `sara.malik@tutorly.pk`
- `usman.raza@tutorly.pk`

Again, the password fields in `seed.sql` are placeholder hashes only. For actual frontend login, matching Supabase auth accounts are required.

---

### Academy
**Can do:**
- Register and log in
- Top up wallet
- Purchase academy subscription
- Add courses manually
- Seed demo courses
- Delete courses when no students are enrolled
- View enrollments
- Chat with students
- Submit app feedback

**Cannot do:**
- Request tutor withdrawals
- Review payouts

**Testing Accounts**
`seed.sql` contains sample academy emails such as:
- `info@brightfuture.pk`
- `contact@eliteprep.pk`
- `hello@knowledgehub.pk`

As with other roles, matching auth users must exist for actual login testing.



## Feature Walkthrough

### Authentication
**Role(s):** Student, Tutor, Academy  
**What it does:** Supports registration, login, logout, password reset, email verification, and session restoration through `/auth/me`.  
**Frontend pages:** `/login`, `/register`, `/forgot-password`, `/reset-password`  
**API mapping:**  
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Student Wallet Top-Up
**Role(s):** Student  
**What it does:** Allows students to add funds into their wallet before booking tutor sessions or enrolling in academy courses.  
**Frontend page:** `/student/wallet`  
**API mapping:**  
- `POST /api/v1/sessions/student/topup`

### Tutor Discovery and Booking
**Role(s):** Student  
**What it does:** Lets students search subscribed tutors, load available slots, and book paid tutor sessions.  
**Frontend page:** `/student/tutors`  
**API mapping:**  
- `GET /api/v1/discovery/tutors`
- `GET /api/v1/sessions/tutors`
- `GET /api/v1/sessions/tutors/:tutorId/slots`
- `POST /api/v1/sessions/bookings`

### Booking Confirmation
**Role(s):** Student, Tutor  
**What it does:** After the session time passes, both sides can confirm or reject the session outcome, which determines whether escrow is released or refunded.  
**Frontend pages:** `/student/bookings`, `/tutor/bookings`  
**API mapping:**  
- `GET /api/v1/sessions/bookings/my`
- `POST /api/v1/sessions/bookings/:bookingId/confirm`

### Tutor Subscription
**Role(s):** Tutor  
**What it does:** Allows tutors to top up wallet funds, purchase plans, and view current/past subscriptions.  
**Frontend page:** `/tutor/subscription`  
**API mapping:**  
- `GET /api/v1/subscriptions/plans`
- `GET /api/v1/subscriptions/tutor/status`
- `POST /api/v1/subscriptions/tutor/topup`
- `POST /api/v1/subscriptions/tutor/purchase`
- `GET /api/v1/subscriptions/tutor/my`

### Tutor Withdrawal Flow
**Role(s):** Tutor
**What it does:** Tutors request withdrawals from wallet funds, and approve or reject them. Rejected withdrawals refund the tutor wallet.  
**Frontend pages:** `/tutor/withdrawals`
**API mapping:**  
- `POST /api/v1/withdrawals/request`
- `GET /api/v1/withdrawals/my`

### Academy Discovery and Enrollment
**Role(s):** Student  
**What it does:** Allows students to discover subscribed academies, browse courses, and enroll by paying from their wallet.  
**Frontend page:** `/student/academies`  
**API mapping:**  
- `GET /api/v1/discovery/academies`
- `GET /api/v1/academies/list`
- `GET /api/v1/academies/:academyId/courses`
- `POST /api/v1/academies/enroll`
- `GET /api/v1/academies/enrollments/my`

### Academy Course Management
**Role(s):** Academy  
**What it does:** Allows academies to add manual courses, seed demo courses, list their own courses, and delete courses when no students are enrolled.  
**Frontend page:** `/academy/courses`  
**API mapping:**  
- `GET /api/v1/academies/academy/courses/my`
- `POST /api/v1/academies/academy/courses`
- `DELETE /api/v1/academies/academy/courses/:courseId`
- `POST /api/v1/academies/academy/courses/seed-demo`

### Academy Subscription
**Role(s):** Academy  
**What it does:** Allows academies to top up wallet funds, purchase subscriptions, and view status/history.  
**Frontend page:** `/academy/subscription`  
**API mapping:**  
- `GET /api/v1/subscriptions/academy/status`
- `POST /api/v1/subscriptions/academy/topup`
- `POST /api/v1/subscriptions/academy/purchase`
- `GET /api/v1/subscriptions/academy/my`

### Chat
**Role(s):** Student, Tutor, Academy  
**What it does:** Supports conversation listing, thread loading, and sending messages between allowed participants.  
**Frontend pages:** `/student/chat`, `/tutor/chat`, `/academy/chat`  
**API mapping:**  
- `GET /api/v1/chat/conversations`
- `GET /api/v1/chat/messages/:peerAccountId`
- `POST /api/v1/chat/messages`

### Reviews
**Role(s):** Student, Tutor  
**What it does:** Students can submit reviews for eligible completed tutor sessions, and tutors can view their feedback.  
**Frontend pages:** `/student/reviews`, `/tutor/reviews`  
**API mapping:**  
- `POST /api/v1/reviews`
- `GET /api/v1/reviews/my`

### App Feedback
**Role(s):** Student, Tutor, Academy
**What it does:**  roles can submit platform feedback
**Frontend pages:** `/student/feedback`, `/tutor/feedback`, `/academy/feedback`  
**API mapping:**  
- `POST /api/v1/app-feedback`
- `GET /api/v1/app-feedback/my`

### Analytics and Filtering
**Role(s):** Student, Tutor, Academy
**What it does:** Dashboards show role-specific analytics charts, and discovery pages support advanced filtering for tutors and academies.  
**Frontend pages:** dashboard pages and student discovery pages  
**API mapping:**  
- `GET /api/v1/discovery/tutors`
- `GET /api/v1/discovery/academies`

---

## Transaction Scenarios

### 1. Tutor Session Booking with Escrow
**Trigger:** A student books a tutor session.  
**Atomic operations bundled together:**
- validate bookable tutor and slot
- lock student wallet row
- check sufficient wallet balance
- create booking
- create payment record
- deduct student wallet balance
- commit booking in escrow-held state

**Rollback causes:**
- invalid tutor or inactive subscription
- invalid or already-booked slot
- insufficient student wallet balance
- session time in the past
- any database failure during booking creation

**Relevant API endpoint:** `POST /api/v1/sessions/bookings`  
**Relevant code:** `src/services/sessionBookingService.js` → `bookTutorSession()`

### 2. Tutor Session Confirmation / Release or Refund
**Trigger:** Student or tutor confirms a booked session after the session time has passed.  
**Atomic operations bundled together:**
- lock booking row
- validate role ownership
- record confirmation decision
- if both confirm `true`, release escrow to tutor wallet
- if either side confirms `false`, refund student wallet
- update booking and payment statuses consistently

**Rollback causes:**
- session not yet due
- unauthorized account
- booking not found
- already processed escrow
- any wallet/payment update failure

**Relevant API endpoint:** `POST /api/v1/sessions/bookings/:bookingId/confirm`  
**Relevant code:** `src/services/sessionBookingService.js` → `confirmSession()`

### 3. Academy Course Enrollment
**Trigger:** A student enrolls in an academy course.  
**Atomic operations bundled together:**
- validate academy subscription
- lock student wallet row
- lock academy wallet row
- lock course row
- check seat capacity
- check duplicate enrollment
- deduct student wallet balance
- increase academy wallet balance
- create enrollment record
- create enrollment payment record
- increment enrolled count

**Rollback causes:**
- academy not active
- course not found
- insufficient student wallet balance
- course full
- duplicate enrollment
- any database failure while updating wallets or enrollment records

**Relevant API endpoint:** `POST /api/v1/academies/enroll`  
**Relevant code:** `src/services/academyEnrollmentService.js` → `enrollInAcademyCourse()`

### 4. Tutor Withdrawal Request
**Trigger:** A tutor requests a withdrawal from the tutor wallet.  
**Atomic operations bundled together:**
- lock tutor wallet row
- validate sufficient balance
- create withdrawal request
- deduct tutor wallet balance
- commit pending request

**Rollback causes:**
- insufficient tutor wallet balance
- invalid amount
- missing wallet
- any database failure during deduction or request creation

**Relevant API endpoint:** `POST /api/v1/withdrawals/request`  
**Relevant code:** `src/services/withdrawalService.js` → `requestTutorWithdrawal()`

### 6. Subscription Purchase
**Trigger:** A tutor or academy purchases a subscription plan.  
**Atomic operations bundled together:**
- validate current plan state
- lock wallet
- validate sufficient balance
- deduct subscription amount
- create subscription record
- update active status

**Rollback causes:**
- insufficient wallet balance
- already active subscription
- invalid role/profile
- any database failure during purchase

**Relevant API endpoints:**  
- `POST /api/v1/subscriptions/tutor/purchase`  
- `POST /api/v1/subscriptions/academy/purchase`  

**Relevant code:** `src/services/subscriptionService.js` → tutor and academy purchase functions

---

## ACID Compliance

| ACID Property | Implementation in Tutorly |
|---|---|
| **Atomicity** | Money-sensitive operations such as tutor booking, academy enrollment, subscription purchase, and withdrawals are wrapped in `BEGIN`, `COMMIT`, and `ROLLBACK` transactions in service files such as `sessionBookingService.js`, `academyEnrollmentService.js`, `subscriptionService.js`, and `withdrawalService.js`. |
| **Consistency** | Database constraints enforce valid states, for example role checks, unique emails, rating bounds, non-negative balances, valid booking/payment statuses, valid subscription plans, and capacity rules. These are defined in `docs/database/schema.sql`. |
| **Isolation** | Critical rows are locked using `FOR UPDATE` during wallet, booking, course, and withdrawal processing to prevent race conditions and double-spending. |
| **Durability** | Once committed, changes are stored in PostgreSQL/Supabase and remain persistent across requests and server restarts. |
| **Triggers / Business Automation** | `trg_calculate_commission` calculates commission before booking writes, `trg_tutor_wallet` and `trg_academy_wallet` auto-create wallets, and `trg_update_progress` updates student progress after quiz inserts. These are defined in `docs/database/schema.sql`. |

---

## Indexing & Performance

The project includes explicit indexing and performance testing in `performance.sql`.

### Indexes Added
- `idx_tutors_verified` on `tutors(is_verified)`  
  Improves tutor discovery when filtering verified tutors.

- `idx_tutors_city_mode` on `tutors(city, teaching_mode)`  
  Improves tutor search by city and teaching mode.

- `idx_tutor_subjects_subject` on `tutor_subjects(subject_id)`  
  Speeds up tutor-subject lookup during tutor discovery.

- `idx_reviews_status` on `reviews(status)`  
  Improves filtering of approved reviews.

- `idx_bookings_status` on `bookings(booking_status)`  
  Improves booking list and analytics queries by status.

- `idx_bookings_student` on `bookings(student_id)`  
  Speeds up student booking history retrieval.

- `idx_payments_booking` on `payments(booking_id)`  
  Improves booking-to-payment joins.

- `idx_withdrawal_status` on `withdrawal_requests(status)`  
  Speeds up pending-withdrawal queue retrieval.

- `idx_withdrawal_wallet` on `withdrawal_requests(wallet_id)`  
  Improves joins between withdrawal requests and wallet records.

- `idx_wallets_tutor` on `wallets(tutor_id)`  
  Speeds up tutor wallet lookups.

- `idx_student_progress_student` on `student_progress(student_id)`  
  Improves student progress lookup.

- `idx_progress_quizzes_progress` on `progress_quizzes(progress_id)`  
  Speeds up progress-to-quiz joins.

- `idx_progress_quizzes_period` on `progress_quizzes(quiz_year, quiz_month, quiz_number_in_month)`  
  Improves ordered progress analysis by quiz period.

### Performance Summary
`performance.sql` compares `EXPLAIN ANALYZE` results before and after indexing for these query groups:
- tutor discovery with subject, city, and mode filters
- student booking history with payment joins
- pending withdrawal review queue
- student progress analytics

In each case, indexing reduces scan cost and improves lookup efficiency by turning repeated full-table or wider join work into faster indexed access paths. The exact before/after execution times should be taken from the submitted `performance.sql` run output or screenshots.

---

## API Reference

The full API is documented in `swagger.yaml`. The table below is a quick-reference summary.

| Method | Route | Auth Required | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | No | Register a student, tutor, or academy account |
| POST | `/api/v1/auth/login` | No | Log in and receive auth tokens |
| POST | `/api/v1/auth/resend-verification` | No | Resend email verification |
| POST | `/api/v1/auth/forgot-password` | No | Send password reset email |
| POST | `/api/v1/auth/reset-password` | No | Reset password using recovery tokens |
| GET | `/api/v1/auth/me` | Yes | Return current authenticated account and role profile |
| POST | `/api/v1/auth/logout` | Yes | Log out current session |
| GET | `/api/v1/subscriptions/plans` | No | Return available tutor subscription plans |
| GET | `/api/v1/subscriptions/tutor/status` | Yes (`tutor`) | Get tutor subscription and wallet status |
| POST | `/api/v1/subscriptions/tutor/topup` | Yes (`tutor`) | Top up tutor wallet |
| POST | `/api/v1/subscriptions/tutor/purchase` | Yes (`tutor`) | Purchase tutor subscription |
| GET | `/api/v1/subscriptions/tutor/my` | Yes (`tutor`) | View tutor subscription history |
| GET | `/api/v1/subscriptions/academy/status` | Yes (`academy`) | Get academy subscription and wallet status |
| POST | `/api/v1/subscriptions/academy/topup` | Yes (`academy`) | Top up academy wallet |
| POST | `/api/v1/subscriptions/academy/purchase` | Yes (`academy`) | Purchase academy subscription |
| GET | `/api/v1/subscriptions/academy/my` | Yes (`academy`) | View academy subscription history |
| POST | `/api/v1/sessions/student/topup` | Yes (`student`) | Top up student wallet |
| GET | `/api/v1/sessions/tutors` | Yes (`student`) | List bookable tutors |
| GET | `/api/v1/sessions/tutors/:tutorId/slots` | Yes (`student`) | Get tutor slots for a selected date |
| POST | `/api/v1/sessions/bookings` | Yes (`student`) | Book a tutor session |
| GET | `/api/v1/sessions/bookings/my` | Yes (`student`, `tutor`) | View own bookings |
| POST | `/api/v1/sessions/bookings/:bookingId/confirm` | Yes (`student`, `tutor`) | Confirm or reject session outcome |
| GET | `/api/v1/withdrawals/my` | Yes (`tutor`) | View tutor withdrawal history |
| POST | `/api/v1/withdrawals/request` | Yes (`tutor`) | Request tutor withdrawal |
| GET | `/api/v1/discovery/tutors` | Yes (`student`) | Search tutors with filters |
| GET | `/api/v1/discovery/academies` | Yes (`student`) | Search academies with filters |
| GET | `/api/v1/academies/list` | Yes (`student`) | List active academies |
| GET | `/api/v1/academies/:academyId/courses` | Yes (`student`) | View courses of a selected academy |
| POST | `/api/v1/academies/enroll` | Yes (`student`) | Enroll in an academy course |
| GET | `/api/v1/academies/enrollments/my` | Yes (`student`, `academy`) | View enrollments |
| GET | `/api/v1/academies/academy/courses/my` | Yes (`academy`) | View own academy courses |
| POST | `/api/v1/academies/academy/courses` | Yes (`academy`) | Create academy course |
| DELETE | `/api/v1/academies/academy/courses/:courseId` | Yes (`academy`) | Delete academy course if no students are enrolled |
| POST | `/api/v1/academies/academy/courses/seed-demo` | Yes (`academy`) | Seed demo courses |
| GET | `/api/v1/chat/conversations` | Yes (`student`, `tutor`, `academy`) | List conversations |
| GET | `/api/v1/chat/messages/:peerAccountId` | Yes (`student`, `tutor`, `academy`) | Load conversation thread |
| POST | `/api/v1/chat/messages` | Yes (`student`, `tutor`, `academy`) | Send chat message |
| POST | `/api/v1/reviews` | Yes (`student`) | Submit tutor review |
| GET | `/api/v1/reviews/my` | Yes (`student`, `tutor`) | View submitted or received reviews |
| POST | `/api/v1/app-feedback` | Yes (`student`, `tutor`, `academy`) | Submit app feedback |
| GET | `/api/v1/app-feedback/my` | Yes (`student`, `tutor`, `academy`) | View own submitted feedback |


---

## Known Issues & Limitations

- Public registration is only available for `student`, `tutor`, and `academy`.x accounts must already exist in the backend/auth setup.
- `seed.sql` contains sample role emails, but not usable plaintext passwords. For actual frontend login testing, matching Supabase auth users or newly registered frontend accounts are required.
- Academy reviews are not implemented. Reviews currently support the student-to-tutor flow only.
- Academy-teacher management exists partly in the database schema, but a complete academy-teacher management module is not implemented in the frontend.
- Tutor session pricing remains fixed through the backend session price configuration, while academy courses support per-course pricing.
- Password reset and email verification depend on correct Supabase redirect URL configuration.

## Available Scripts

### Backend
- `npm install` — install backend dependencies
- `npm run dev` — start backend in development mode

### Frontend
From the `frontend/` directory:
- `npm install` — install frontend dependencies
- `npm run dev` — start frontend development server

## Submission Structure Note

This submission follows the required folder structure as closely as possible. Some documentation files are provided in `.docx` format instead of `.pdf`, and the backend entry file is `backend/src/index.js` instead of `server.js`. These differences do not affect project setup or evaluation.

