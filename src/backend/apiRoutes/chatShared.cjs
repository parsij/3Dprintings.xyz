const { createHmac } = require("crypto");

const CHAT_POCKETBASE_URL = String(
  process.env.CHAT_POCKETBASE_URL || "https://3dprintings.xyz/api/chat/"
).replace(/\/?$/, "/");

function getChatPasswordSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret) {
    throw new Error("Missing JWT_SECRET for chat session derivation.");
  }
  return secret;
}

function deriveChatPassword(userId, email) {
  const digest = createHmac("sha256", getChatPasswordSecret())
    .update(`chat-session:${userId}:${String(email || "").trim().toLowerCase()}`)
    .digest("base64url");

  return `Pb${digest.slice(0, 24)}9!`;
}

function buildChatDisplayName(user) {
  const username = String(user?.username || "").trim();
  if (username) return username.slice(0, 100);

  const emailLocalPart = String(user?.email || "").split("@")[0].trim();
  if (emailLocalPart) return emailLocalPart.slice(0, 100);

  return `User ${user?.id}`;
}

async function chatRequest(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = token;
  }

  const response = await fetch(`${CHAT_POCKETBASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `Chat request failed (${response.status})`);
    error.status = response.status;
    error.data = payload?.data || payload;
    throw error;
  }

  return payload;
}

async function authenticateChatUser(email, password) {
  const payload = await chatRequest("api/collections/users/auth-with-password", {
    method: "POST",
    body: {
      identity: email,
      password,
    },
  });

  if (!payload?.token || !payload?.record?.id) {
    throw new Error("Chat authentication returned an incomplete session.");
  }

  return payload;
}

async function registerChatUser(email, password, name) {
  const record = await chatRequest("api/collections/users/records", {
    method: "POST",
    body: {
      email,
      password,
      passwordConfirm: password,
      name,
    },
  });

  if (!record?.id) {
    throw new Error("Chat registration returned an incomplete user record.");
  }

  return authenticateChatUser(email, password);
}

async function ensureChatUserForDbUser(pool, user) {
  const userId = Number(user?.id);
  const email = String(user?.email || "").trim().toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0 || !email) {
    throw new Error("Chat account requires a valid marketplace user.");
  }

  const password = deriveChatPassword(userId, email);
  const name = buildChatDisplayName(user);
  let pocketbaseId = String(user?.pocketbase_id || "").trim();

  try {
    const session = await authenticateChatUser(email, password);
    pocketbaseId = session.record.id;

    if (user.pocketbase_id !== pocketbaseId) {
      await pool.query("UPDATE users SET pocketbase_id = $1 WHERE id = $2", [pocketbaseId, userId]);
    }

    return {
      pocketbaseId,
      token: session.token,
      record: session.record,
    };
  } catch (authError) {
    if (authError?.status !== 400 && authError?.status !== 404) {
      throw authError;
    }
  }

  try {
    const session = await registerChatUser(email, password, name);
    pocketbaseId = session.record.id;

    await pool.query("UPDATE users SET pocketbase_id = $1 WHERE id = $2", [pocketbaseId, userId]);

    return {
      pocketbaseId,
      token: session.token,
      record: session.record,
    };
  } catch (registerError) {
    if (registerError?.status !== 400) {
      throw registerError;
    }

    const session = await authenticateChatUser(email, password);
    pocketbaseId = session.record.id;
    await pool.query("UPDATE users SET pocketbase_id = $1 WHERE id = $2", [pocketbaseId, userId]);

    return {
      pocketbaseId,
      token: session.token,
      record: session.record,
    };
  }
}

async function ensureChatUserPocketBaseId(pool, userId) {
  const parsedUserId = Number(userId);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, email, username, pocketbase_id
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [parsedUserId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const session = await ensureChatUserForDbUser(pool, result.rows[0]);
  return session.pocketbaseId;
}

module.exports = {
  CHAT_POCKETBASE_URL,
  chatRequest,
  deriveChatPassword,
  ensureChatUserForDbUser,
  ensureChatUserPocketBaseId,
};
