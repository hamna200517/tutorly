const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const HttpError = require("../utils/httpError");
const { sendPasswordResetEmail } = require("../config/mailer");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const registerSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: true } }).required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required(),
  role: Joi.string().valid("student", "tutor", "academy").required(),
  name: Joi.string().trim().min(2).max(100).when("role", {
    is: Joi.valid("student", "tutor"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  city: Joi.string().trim().max(100).when("role", {
    is: Joi.valid("student", "tutor", "academy"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  country: Joi.string().trim().max(100).when("role", {
    is: Joi.valid("student", "tutor", "academy"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{7,20}$/).when("role", {
    is: "student",
    then: Joi.required(),
    otherwise: Joi.allow("", null),
  }),
  bio: Joi.string().trim().max(1000).allow("", null),
  education_level: Joi.string().trim().max(100).when("role", {
    is: "tutor",
    then: Joi.required(),
    otherwise: Joi.allow("", null),
  }),
  education_history: Joi.string().trim().max(2000).allow("", null),
  work_history: Joi.string().trim().max(2000).allow("", null),
  teaching_mode: Joi.string().valid("online", "physical", "hybrid").when("role", {
    is: "tutor",
    then: Joi.required(),
    otherwise: Joi.allow(null),
  }),
  profile_picture_url: Joi.string().uri().max(500).allow("", null),
  academy_name: Joi.string().trim().min(2).max(200).when("role", {
    is: "academy",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  description: Joi.string().trim().max(2000).allow("", null),
  logo_url: Joi.string().uri().max(500).allow("", null),
  about: Joi.string().trim().max(2000).allow("", null),
  founded_year: Joi.number().integer().min(1800).max(2100).allow(null),
  owner_name: Joi.string().trim().max(100).when("role", {
    is: "academy",
    then: Joi.required(),
    otherwise: Joi.allow("", null),
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: true } }).required(),
  password: Joi.string().required(),
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: true } }).required(),
});

const logoutSchema = Joi.object({
  refresh_token: Joi.string().trim().min(10).optional(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: true } }).required(),
});

const resetPasswordSchema = Joi.object({
  access_token: Joi.string().trim().min(10).required(),
  refresh_token: Joi.string().trim().min(10).required(),
  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required(),
});

function normalizeNullable(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
}

async function createRoleProfile(client, accountId, payload) {
  if (payload.role === "student") {
    await client.query(
      `
      INSERT INTO students (account_id, name, city, country, phone)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        accountId,
        payload.name,
        normalizeNullable(payload.city),
        normalizeNullable(payload.country),
        normalizeNullable(payload.phone),
      ]
    );
    return;
  }

  if (payload.role === "tutor") {
    await client.query(
      `
      INSERT INTO tutors (
        account_id, name, bio, education_level, city, country,
        education_history, work_history, teaching_mode, profile_picture_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        accountId,
        payload.name,
        normalizeNullable(payload.bio),
        normalizeNullable(payload.education_level),
        normalizeNullable(payload.city),
        normalizeNullable(payload.country),
        normalizeNullable(payload.education_history),
        normalizeNullable(payload.work_history),
        normalizeNullable(payload.teaching_mode),
        normalizeNullable(payload.profile_picture_url),
      ]
    );
    return;
  }

  if (payload.role === "academy") {
    await client.query(
      `
      INSERT INTO academies (
        account_id, academy_name, description, logo_url,
        city, country, about, founded_year, owner_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        accountId,
        payload.academy_name,
        normalizeNullable(payload.description),
        normalizeNullable(payload.logo_url),
        normalizeNullable(payload.city),
        normalizeNullable(payload.country),
        normalizeNullable(payload.about),
        normalizeNullable(payload.founded_year),
        normalizeNullable(payload.owner_name),
      ]
    );
  }
}

async function getRoleProfile(accountId, role) {
  if (role === "student") {
    const result = await pool.query(
      `SELECT student_id, name, city, country, phone FROM students WHERE account_id = $1 LIMIT 1`,
      [accountId]
    );
    return result.rows[0] || null;
  }

  if (role === "tutor") {
    const result = await pool.query(
      `SELECT tutor_id, name, bio, education_level, city, country, is_verified, teaching_mode
       FROM tutors WHERE account_id = $1 LIMIT 1`,
      [accountId]
    );
    return result.rows[0] || null;
  }

  if (role === "academy") {
    const result = await pool.query(
      `SELECT academy_id, academy_name, city, country, is_verified, owner_name
       FROM academies WHERE account_id = $1 LIMIT 1`,
      [accountId]
    );
    return result.rows[0] || null;
  }

  return null;
}

async function provisionLocalAccountIfMissing(email, profilePayload) {
  const existing = await pool.query(
    `SELECT account_id, role, email, created_at FROM accounts WHERE email = $1 LIMIT 1`,
    [email]
  );

  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  if (!profilePayload || !profilePayload.role) {
    throw new HttpError(
      409,
      "MISSING_PROFILE_METADATA",
      "Account metadata not found. Please register again before login."
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const accountResult = await client.query(
      `
      INSERT INTO accounts (role, email, password_hash, is_active)
      VALUES ($1, $2, $3, TRUE)
      RETURNING account_id, role, email, created_at
      `,
      [profilePayload.role, email, "externally_managed"]
    );

    const account = accountResult.rows[0];
    await createRoleProfile(client, account.account_id, profilePayload);

    await client.query("COMMIT");
    return account;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      const row = await pool.query(
        `SELECT account_id, role, email, created_at FROM accounts WHERE email = $1 LIMIT 1`,
        [email]
      );
      if (row.rowCount > 0) {
        return row.rows[0];
      }
    }
    throw err;
  } finally {
    client.release();
  }
}

exports.register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid registration payload",
      error.details.map((d) => d.message)
    );
  }

  const email = value.email.toLowerCase();

  const existingAccount = await pool.query(`SELECT account_id FROM accounts WHERE email = $1 LIMIT 1`, [email]);
  if (existingAccount.rowCount > 0) throw new HttpError(409, "DUPLICATE_EMAIL", "Email already exists");

  const passwordHash = await bcrypt.hash(value.password, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const accountResult = await client.query(
      `
      INSERT INTO accounts (role, email, password_hash, is_active)
      VALUES ($1, $2, $3, TRUE)
      RETURNING account_id, role, email, created_at
      `,
      [value.role, email, passwordHash]
    );

    const account = accountResult.rows[0];
    
    await createRoleProfile(client, account.account_id, value);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      data: {
        account_id: account.account_id,
        email: account.email,
        role: account.role,
        message: "Registration successful. Please login.",
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid login payload",
      error.details.map((d) => d.message)
    );
  }

  const email = value.email.toLowerCase();
  
  const result = await pool.query(
    `SELECT account_id, role, email, password_hash, is_active FROM accounts WHERE email = $1 LIMIT 1`,
    [email]
  );

  if (result.rowCount === 0) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const account = result.rows[0];
  
  if (!account.is_active) {
    throw new HttpError(401, "ACCOUNT_INACTIVE", "Account is inactive");
  }

  const passwordMatch = await bcrypt.compare(value.password, account.password_hash);
  if (!passwordMatch) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const access_token = jwt.sign(
    { account_id: account.account_id, email: account.email, role: account.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  const refresh_token = jwt.sign(
    { account_id: account.account_id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    data: {
      access_token,
      refresh_token,
      token_type: "Bearer",
      expires_in: 86400,
      user: {
        account_id: account.account_id,
        email: account.email,
        role: account.role,
      },
    },
  });
};

exports.resendVerification = async (req, res) => {
  res.json({
    success: true,
    data: {
      message: "Email verification is not required for local authentication.",
    },
  });
};

exports.me = async (req, res) => {
  const profile = await getRoleProfile(req.user.account_id, req.user.role);

  res.json({
    success: true,
    data: {
      account_id: req.user.account_id,
      email: req.user.email,
      role: req.user.role,
      profile,
    },
  });
};

exports.logout = async (req, res) => {
  res.json({
    success: true,
    data: {
      message: "Logged out successfully. Clear tokens from client storage.",
    },
  });
};

exports.forgotPassword = async (req, res) => {
  const { error, value } = forgotPasswordSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid forgot-password payload", error.details.map((d) => d.message));
  }

  const email = value.email.toLowerCase();
  const result = await pool.query(`SELECT account_id FROM accounts WHERE email = $1 LIMIT 1`, [email]);

  if (result.rowCount > 0) {
    const account = result.rows[0];
    const resetToken = jwt.sign({ account_id: account.account_id }, JWT_SECRET, { expiresIn: "1h" });
    const dummyRefreshToken = jwt.sign({ account_id: account.account_id }, JWT_SECRET, { expiresIn: "1h" });
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?access_token=${resetToken}&refresh_token=${dummyRefreshToken}`;

    try {
      await sendPasswordResetEmail(email, resetLink);
    } catch (mailErr) {
      throw new HttpError(500, "EMAIL_ERROR", "Failed to send reset email. Please check server email configuration.");
    }
  }

  res.json({
    success: true,
    data: { message: "If this email exists, password reset instructions have been sent." },
  });
};

exports.resetPassword = async (req, res) => {
  const { error, value } = resetPasswordSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid reset-password payload",
      error.details.map((d) => d.message)
    );
  }

  try {
    const decoded = jwt.verify(value.access_token, JWT_SECRET);
    
    const passwordHash = await bcrypt.hash(value.new_password, 10);
    
    await pool.query(
      `UPDATE accounts SET password_hash = $1 WHERE account_id = $2`,
      [passwordHash, decoded.account_id]
    );

    res.json({
      success: true,
      data: {
        message: "Password reset successful. Please login again.",
      },
    });
  } catch (err) {
    throw new HttpError(401, "RESET_TOKEN_INVALID", "Reset token is invalid or expired");
  }
};
