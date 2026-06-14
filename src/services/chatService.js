const pool = require("../config/db");
const HttpError = require("../utils/httpError");

function normalizeRolePair(roleA, roleB) {
  return [roleA, roleB].sort().join(":");
}

function isAllowedRolePair(roleA, roleB) {
  const key = normalizeRolePair(roleA, roleB);
  return key === "student:tutor" || key === "academy:student";
}

async function getAccount(accountId) {
  const row = await pool.query(
    `SELECT account_id, email, role, is_active FROM accounts WHERE account_id = $1 LIMIT 1`,
    [accountId]
  );
  if (row.rowCount === 0) {
    throw new HttpError(404, "ACCOUNT_NOT_FOUND", "Account not found");
  }
  return row.rows[0];
}

async function assertAllowedChatPair(accountIdA, accountIdB) {
  if (Number(accountIdA) === Number(accountIdB)) {
    throw new HttpError(400, "INVALID_CHAT_TARGET", "Cannot chat with same account");
  }

  const [a, b] = await Promise.all([getAccount(accountIdA), getAccount(accountIdB)]);

  if (!a.is_active || !b.is_active) {
    throw new HttpError(403, "ACCOUNT_INACTIVE", "One of the accounts is inactive");
  }

  if (!isAllowedRolePair(a.role, b.role)) {
    throw new HttpError(
      403,
      "CHAT_PAIR_NOT_ALLOWED",
      "Chat is allowed only between student-tutor or student-academy"
    );
  }

  return { a, b };
}

async function sendMessage(senderAccountId, receiverAccountId, content) {
  const pair = await assertAllowedChatPair(senderAccountId, receiverAccountId);

  const inserted = await pool.query(
    `
    INSERT INTO messages (sender_account_id, receiver_account_id, content, sent_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING message_id, sender_account_id, receiver_account_id, content, sent_at
    `,
    [senderAccountId, receiverAccountId, content]
  );

  return {
    message: inserted.rows[0],
    participants: {
      sender: { account_id: pair.a.account_id, role: pair.a.role, email: pair.a.email },
      receiver: { account_id: pair.b.account_id, role: pair.b.role, email: pair.b.email },
    },
  };
}

async function listConversations(accountId) {
  const self = await getAccount(accountId);
  const result = await pool.query(
    `
    WITH peers AS (
      SELECT receiver_account_id AS peer_account_id, MAX(sent_at) AS last_message_at
      FROM messages
      WHERE sender_account_id = $1
      GROUP BY receiver_account_id
      UNION
      SELECT sender_account_id AS peer_account_id, MAX(sent_at) AS last_message_at
      FROM messages
      WHERE receiver_account_id = $1
      GROUP BY sender_account_id
    ),
    merged AS (
      SELECT peer_account_id, MAX(last_message_at) AS last_message_at
      FROM peers
      GROUP BY peer_account_id
    )
    SELECT
      m.peer_account_id,
      a.email AS peer_email,
      a.role AS peer_role,
      m.last_message_at,
      (
        SELECT msg.content
        FROM messages msg
        WHERE (
          (msg.sender_account_id = $1 AND msg.receiver_account_id = m.peer_account_id) OR
          (msg.sender_account_id = m.peer_account_id AND msg.receiver_account_id = $1)
        )
        ORDER BY msg.sent_at DESC
        LIMIT 1
      ) AS last_message
    FROM merged m
    JOIN accounts a ON a.account_id = m.peer_account_id
    ORDER BY m.last_message_at DESC
    `,
    [accountId]
  );

  const safe = result.rows.filter((row) => isAllowedRolePair(self.role, row.peer_role));
  return safe;
}

async function getThread(accountId, peerAccountId, limit = 50, offset = 0) {
  const pair = await assertAllowedChatPair(accountId, peerAccountId);

  const result = await pool.query(
    `
    SELECT message_id, sender_account_id, receiver_account_id, content, sent_at
    FROM messages
    WHERE (
      (sender_account_id = $1 AND receiver_account_id = $2) OR
      (sender_account_id = $2 AND receiver_account_id = $1)
    )
    ORDER BY sent_at DESC
    LIMIT $3 OFFSET $4
    `,
    [accountId, peerAccountId, limit, offset]
  );

  return {
    participants: [
      { account_id: pair.a.account_id, role: pair.a.role, email: pair.a.email },
      { account_id: pair.b.account_id, role: pair.b.role, email: pair.b.email },
    ],
    messages: result.rows.reverse(),
  };
}

async function getChatContacts(accountId, role) {
  if (role === "student") {
    const result = await pool.query(
      `
      SELECT DISTINCT
        a.account_id,
        a.email,
        a.role,
        COALESCE(t.name, ac.academy_name) AS label
      FROM bookings b
      LEFT JOIN tutors t ON t.tutor_id = b.tutor_id
      LEFT JOIN academies ac ON ac.academy_id = b.academy_id
      LEFT JOIN accounts a ON (
        (b.tutor_id IS NOT NULL AND a.account_id = t.account_id) OR
        (b.academy_id IS NOT NULL AND a.account_id = ac.account_id)
      )
      JOIN students s ON s.student_id = b.student_id
      WHERE s.account_id = $1
        AND a.account_id IS NOT NULL
        AND a.is_active = TRUE
      ORDER BY a.account_id
      `,
      [accountId]
    );
    return result.rows;
  }

  if (role === "tutor") {
    const result = await pool.query(
      `
      SELECT DISTINCT
        a.account_id,
        a.email,
        a.role,
        s.name AS label
      FROM bookings b
      JOIN students s ON s.student_id = b.student_id
      JOIN accounts a ON a.account_id = s.account_id
      JOIN tutors t ON t.tutor_id = b.tutor_id
      WHERE t.account_id = $1
        AND a.is_active = TRUE
      ORDER BY a.account_id
      `,
      [accountId]
    );
    return result.rows;
  }

  if (role === "academy") {
    const result = await pool.query(
      `
      SELECT DISTINCT
        a.account_id,
        a.email,
        a.role,
        s.name AS label
      FROM academy_enrollments ae
      JOIN students s ON s.student_id = ae.student_id
      JOIN accounts a ON a.account_id = s.account_id
      JOIN academies ac ON ac.academy_id = ae.academy_id
      WHERE ac.account_id = $1
        AND a.is_active = TRUE
      ORDER BY a.account_id
      `,
      [accountId]
    );
    return result.rows;
  }

  return [];
}

module.exports = {
  sendMessage,
  listConversations,
  getThread,
  getChatContacts,
};
