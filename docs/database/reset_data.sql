-- Wipes every account, tutor, academy, student, booking, message,
-- subscription, wallet, course, enrollment, review, etc.
-- Keeps the table structure (schema) intact so the app keeps working.
-- Run after loading full_schema_and_migrations.sql:
--
--   psql tutorly < docs/database/reset_data.sql
--
-- After this, register your accounts again from the app, then
-- re-run the admin promotion commands from START_HERE.txt step 4.

TRUNCATE TABLE accounts RESTART IDENTITY CASCADE;
