const bcrypt = require('bcrypt');
const { createHash, randomBytes } = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const { z } = require('zod');

const RESET_TOKEN_TTL_MINUTES = 60;
let mailTransporter = null;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254, 'Email is too long');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number');

const resetTokenSchema = z
  .string()
  .trim()
  .min(20, 'Invalid or expired reset link')
  .max(200, 'Invalid or expired reset link');

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens'),
  email: emailSchema,
  password: passwordSchema,
}).strict();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
}).strict();

const passwordResetRequestSchema = z.object({
  email: emailSchema,
}).strict();

const passwordResetConsumeSchema = z.object({
  token: resetTokenSchema,
}).strict();

const passwordResetConfirmSchema = z.object({
  resetSessionToken: resetTokenSchema,
  password: passwordSchema,
}).strict();

const googleCredentialSchema = z.object({
  credential: z.string().trim().min(1, 'Missing Google credential').max(4096, 'Google credential is too long'),
}).strict();

const noopMiddleware = (req, res, next) => next();

function buildUsernameFromGoogleProfile(name, email) {
  const rawName = String(name || '').trim().toLowerCase();
  const rawEmailLocalPart = String(email || '')
    .split('@')[0]
    .trim()
    .toLowerCase();

  const normalize = (value) =>
    value
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/[._-]{2,}/g, '.')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 40);

  let username = normalize(rawName) || normalize(rawEmailLocalPart);
  if (username.length < 3) {
    username = `user${Math.floor(Math.random() * 1_000_000)}`.slice(0, 40);
  }

  return username;
}

function normalizeOrigin(origin) {
  return String(origin || '')
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase();
}

function isAllowedFrontendOrigin(origin, configuredFrontendOrigin) {
  if (!origin) return false;
  if (configuredFrontendOrigin && origin === configuredFrontendOrigin) return true;

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:') return false;
    return parsed.hostname === '3dprintings.xyz' || parsed.hostname.endsWith('.3dprintings.xyz');
  } catch {
    return false;
  }
}

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function validateBody(schema, body) {
  const parsed = schema.safeParse(body);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  return {
    ok: false,
    message: parsed.error.issues[0]?.message || 'Invalid request body',
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getMailTransporter() {
  const user = String(process.env.PERSONAL_GMAIL_ADDRESS || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').trim();

  if (!user || !pass) {
    throw new Error('Missing PERSONAL_GMAIL_ADDRESS or GMAIL_APP_PASSWORD');
  }

  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return mailTransporter;
}

function buildResetUrl(req, frontendOrigin, token) {
  const requestOrigin = normalizeOrigin(req.headers.origin);
  let origin = frontendOrigin || 'https://3dprintings.xyz';

  if (requestOrigin && isAllowedFrontendOrigin(requestOrigin, frontendOrigin)) {
    origin = requestOrigin;
  }

  return `${origin}/reset-password/${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(userEmail, resetUrl) {
  const transporter = getMailTransporter();
  const safeResetUrl = escapeHtml(resetUrl);

  await transporter.sendMail({
    from: '"3D Printings Management" <management@3dprintings.xyz>',
    to: userEmail,
    subject: 'Reset your 3D Printings password',
    html: `
      <p>You requested a password reset for 3D Printings.</p>
      <p>This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes and can only be used once.</p>
      <p><a href="${safeResetUrl}">Click here to reset your password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

module.exports = function authRoutes(deps) {
  const {
    app,
    pool,
    createAuthToken,
    setAuthCookie,
    clearAuthCookie,
    setCsrfCookie,
    clearCsrfCookie,
    getAuthUserFromRequest,
    EMAIL_REGEX,
    authRateLimiter = noopMiddleware,
    passwordResetRateLimiter = noopMiddleware,
  } = deps;
  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const googleOAuthClient = googleClientId ? new OAuth2Client(googleClientId) : null;
  const frontendOrigin = normalizeOrigin(process.env.FRONTEND_URL);

  app.post('/api/password-reset/request', passwordResetRateLimiter, async (req, res) => {
    try {
      const validation = validateBody(passwordResetRequestSchema, req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const normalizedEmail = validation.data.email;
      const genericMessage = 'If an account exists for that email, a reset link has been sent.';
      const userResult = await pool.query(
        'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
        [normalizedEmail]
      );

      if (userResult.rows.length === 0) {
        return res.json({ message: genericMessage });
      }

      const user = userResult.rows[0];
      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = hashResetToken(rawToken);
      const resetUrl = buildResetUrl(req, frontendOrigin, rawToken);

      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + ($3::text || ' minutes')::interval)`,
        [user.id, tokenHash, RESET_TOKEN_TTL_MINUTES]
      );

      await sendPasswordResetEmail(user.email, resetUrl);
      return res.json({ message: genericMessage });
    } catch (err) {
      console.error('Password reset request error:', err.message || err);
      return res.status(500).json({ message: 'Could not send a reset link right now. Please try again later.' });
    }
  });

  app.post('/api/password-reset/consume', passwordResetRateLimiter, async (req, res) => {
    const client = await pool.connect();

    try {
      const validation = validateBody(passwordResetConsumeSchema, req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: 'Expired link' });
      }

      const { token } = validation.data;
      const tokenHash = hashResetToken(token);
      const resetSessionToken = randomBytes(32).toString('base64url');
      const resetSessionHash = hashResetToken(resetSessionToken);

      await client.query('BEGIN');
      const tokenResult = await client.query(
        `SELECT id
         FROM password_reset_tokens
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Expired link' });
      }

      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW(), reset_session_hash = $1
         WHERE id = $2`,
        [resetSessionHash, tokenResult.rows[0].id]
      );
      await client.query('COMMIT');

      return res.json({ resetSessionToken });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => null);
      console.error('Password reset consume error:', err.message || err);
      return res.status(500).json({ message: 'Could not open reset link. Please request a new link.' });
    } finally {
      client.release();
    }
  });

  app.post('/api/password-reset/confirm', passwordResetRateLimiter, async (req, res) => {
    const client = await pool.connect();

    try {
      const validation = validateBody(passwordResetConfirmSchema, req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const { resetSessionToken, password } = validation.data;
      const resetSessionHash = hashResetToken(resetSessionToken);
      await client.query('BEGIN');

      const tokenResult = await client.query(
        `SELECT prt.id, prt.user_id, users.username, users.email, users.phone_number, users.password, COALESCE(users.role, 'customer') AS role
         FROM password_reset_tokens prt
         JOIN users ON users.id = prt.user_id
         WHERE prt.reset_session_hash = $1
           AND prt.used_at IS NOT NULL
           AND prt.password_reset_at IS NULL
           AND prt.expires_at > NOW()
         FOR UPDATE`,
        [resetSessionHash]
      );

      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid or expired reset link' });
      }

      const user = tokenResult.rows[0];
      const samePassword = await bcrypt.compare(password, user.password);
      if (samePassword) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'New password must be different from the current password' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.user_id]);
      await client.query('UPDATE password_reset_tokens SET password_reset_at = NOW() WHERE id = $1', [user.id]);
      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = COALESCE(used_at, NOW())
         WHERE user_id = $1 AND id <> $2 AND used_at IS NULL`,
        [user.user_id, user.id]
      );
      await client.query('COMMIT');

      const authUser = {
        id: user.user_id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      };
      setAuthCookie(res, createAuthToken(authUser));

      return res.json({
        message: 'Password reset successfully',
        user: {
          id: Number(authUser.id),
          username: authUser.username,
          email: authUser.email,
          phone_number: authUser.phone_number,
          role: authUser.role,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => null);
      console.error('Password reset confirm error:', err.message || err);
      return res.status(500).json({ message: 'Could not reset password right now. Please try again later.' });
    } finally {
      client.release();
    }
  });

  app.post('/api/signup', authRateLimiter, async (req, res) => {
    try {
      const validation = validateBody(signupSchema, req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const { username: normalizedUsername, email: normalizedEmail, password } = validation.data;
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, phone_number, COALESCE(role, 'customer') AS role
    `;

      const values = [normalizedUsername, normalizedEmail, hashedPassword];
      const result = await pool.query(query, values);

      const user = result.rows[0];
      const token = createAuthToken(user);
      setAuthCookie(res, token);
      setCsrfCookie(res);

      return res.status(201).json({
        message: 'User created',
        user: {
          id: Number(user.id),
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
        },
      });
    } catch (err) {
      console.error('Signup error:', err.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/login', authRateLimiter, async (req, res) => {
    try {
      const validation = validateBody(loginSchema, req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const { email: normalizedEmail, password } = validation.data;
      const result = await pool.query('SELECT id, username, email, phone_number, password, COALESCE(role, \'customer\') AS role FROM users WHERE email = $1', [
        normalizedEmail,
      ]);

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const ok = await bcrypt.compare(password, user.password);

      if (!ok) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const token = createAuthToken(user);
      setAuthCookie(res, token);
      setCsrfCookie(res);
      return res.json({
        message: 'Signed in',
        user: {
          id: Number(user.id),
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
        },
      });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/auth/google/config', (req, res) => {
    if (!googleClientId) {
      return res.status(503).json({ message: 'Google sign-in is not configured on server' });
    }

    return res.json({ clientId: googleClientId });
  });

  app.post('/api/auth/google', authRateLimiter, async (req, res) => {
    try {
      const requestOrigin = normalizeOrigin(req.headers.origin);
      if (requestOrigin && !isAllowedFrontendOrigin(requestOrigin, frontendOrigin)) {
        return res.status(403).json({ message: 'Blocked origin' });
      }

      const validation = validateBody(googleCredentialSchema, req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const { credential } = validation.data;
      if (!googleOAuthClient || !googleClientId) {
        return res.status(503).json({ message: 'Google sign-in is not configured on server' });
      }

      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        return res.status(401).json({ message: 'Invalid Google token' });
      }

      const issuer = String(payload.iss || '');
      const validIssuer = issuer === 'accounts.google.com' || issuer === 'https://accounts.google.com';
      if (!validIssuer) {
        return res.status(401).json({ message: 'Invalid Google token issuer' });
      }

      const googleSub = String(payload.sub || '').trim();
      const email = String(payload.email || '').trim().toLowerCase();
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
      const audience = String(payload.aud || '').trim();
      const exp = Number(payload.exp);
      const iat = Number(payload.iat);
      const nowUnix = Math.floor(Date.now() / 1000);
      const clockSkewSeconds = 300;

      if (audience !== googleClientId) {
        return res.status(401).json({ message: 'Invalid Google token audience' });
      }

      if (!Number.isFinite(exp) || exp <= nowUnix - clockSkewSeconds) {
        return res.status(401).json({ message: 'Google token is expired' });
      }

      if (!Number.isFinite(iat) || iat <= 0 || iat > nowUnix + clockSkewSeconds || iat > exp) {
        return res.status(401).json({ message: 'Invalid Google token issue time' });
      }

      if (!googleSub || !email || !emailVerified || !EMAIL_REGEX.test(email)) {
        return res.status(401).json({ message: 'Google account email is not verified' });
      }

      const usernameCandidate = buildUsernameFromGoogleProfile(payload.name, email);
      const existingBySub = await pool.query(
        `SELECT id, username, email, phone_number, COALESCE(role, 'customer') AS role
         FROM users
         WHERE google_sub = $1
         LIMIT 1`,
        [googleSub]
      );

      let user;
      if (existingBySub.rows.length > 0) {
        const matchedBySub = existingBySub.rows[0];

        if (matchedBySub.email !== email) {
          const conflictingEmailUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1 AND id <> $2
             LIMIT 1`,
            [email, matchedBySub.id]
          );
          if (conflictingEmailUser.rows.length > 0) {
            return res.status(409).json({
              message: 'Google account email is already in use by another account',
            });
          }

          const updatedEmailUser = await pool.query(
            `UPDATE users
             SET email = $1
             WHERE id = $2
             RETURNING id, username, email, phone_number, google_sub, COALESCE(role, 'customer') AS role`,
            [email, matchedBySub.id]
          );
          user = updatedEmailUser.rows[0];
        } else {
          user = matchedBySub;
        }
      } else {
        const existingByEmail = await pool.query(
        `SELECT id, username, email, phone_number, google_sub, COALESCE(role, 'customer') AS role
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
      );

        if (existingByEmail.rows.length > 0) {
          const matchedUser = existingByEmail.rows[0];

          if (matchedUser.google_sub && matchedUser.google_sub !== googleSub) {
            return res.status(409).json({
              message: 'This email is already linked to a different Google account',
            });
          }

          if (!matchedUser.google_sub) {
            const updated = await pool.query(
              `UPDATE users
               SET google_sub = $1
               WHERE id = $2
               RETURNING id, username, email, phone_number, google_sub, COALESCE(role, 'customer') AS role`,
              [googleSub, matchedUser.id]
            );
            user = updated.rows[0];
          } else {
            user = matchedUser;
          }
        } else {
          const generatedPassword = randomBytes(48).toString('hex');
          const hashedPassword = await bcrypt.hash(generatedPassword, 12);
          const inserted = await pool.query(
            `INSERT INTO users (username, email, password, google_sub)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, phone_number, google_sub, COALESCE(role, 'customer') AS role`,
            [usernameCandidate, email, hashedPassword, googleSub]
          );
          user = inserted.rows[0];
        }
      }

      const token = createAuthToken(user);
      setAuthCookie(res, token);
      setCsrfCookie(res);

      return res.json({
        message: 'Signed in with Google',
        user: {
          id: Number(user.id),
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
          profile: {
            name: payload.name || null,
            given_name: payload.given_name || null,
            family_name: payload.family_name || null,
            picture: payload.picture || null,
            locale: payload.locale || null,
          },
        },
      });
    } catch (err) {
      console.error('Google sign-in error:', err.message || err);
      return res.status(401).json({ message: 'Google sign-in failed' });
    }
  });

  app.post('/api/signout', (req, res) => {

    if (!getAuthUserFromRequest(req)) {
      return res.status(401).json({message: 'User not authenticated.'});
    }
    clearAuthCookie(res);
    clearCsrfCookie(res);
    return res.json({message: 'Signed out'});
  });

  app.get('/api/auth', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const userResult = await pool.query(
        `SELECT id, username, email, phone_number, COALESCE(role, 'customer') AS role
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [authUser.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const user = userResult.rows[0];
      return res.json({
        user: {
          id: Number(user.id),
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
        },
        message: 'Authentication successfully',
      });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  });
};
