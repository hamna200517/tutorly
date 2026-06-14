const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const HttpError = require("../utils/httpError");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

module.exports = async function auth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const accountQuery = `
      SELECT account_id, email, role, is_active, created_at
      FROM accounts
      WHERE account_id = $1
      LIMIT 1
    `;

    const accountResult = await pool.query(accountQuery, [decoded.account_id]);
    if (accountResult.rowCount === 0) {
      throw new HttpError(403, "ACCOUNT_NOT_FOUND", "Account not found");
    }

    const account = accountResult.rows[0];
    if (!account.is_active) {
      throw new HttpError(403, "ACCOUNT_INACTIVE", "Account is inactive");
    }

    req.user = {
      account_id: account.account_id,
      email: account.email,
      role: account.role,
      created_at: account.created_at,
    };
    req.auth_token = token;

    next();
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    throw new HttpError(401, "INVALID_TOKEN", "Invalid or expired token");
  }
};
