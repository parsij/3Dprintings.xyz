const bcrypt = require('bcrypt');
const { randomBytes } = require('crypto');
const { OAuth2Client } = require('google-auth-library');

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

module.exports = function authRoutes(deps) {
  const {
    app,
    pool,
    createAuthToken,
    setAuthCookie,
    clearAuthCookie,
    getAuthUserFromRequest,
    EMAIL_REGEX,
    PASSWORD_REGEX,
  } = deps;
  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const googleOAuthClient = googleClientId ? new OAuth2Client(googleClientId) : null;
  const frontendOrigin = normalizeOrigin(process.env.FRONTEND_URL);

  app.post('/api/signup', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const normalizedUsername = username.trim();
      const normalizedEmail = email.toLowerCase().trim();

      const emailOk = EMAIL_REGEX.test(normalizedEmail);
      const passwordOk = PASSWORD_REGEX.test(password);

      if (!passwordOk || normalizedUsername.length < 3 || !emailOk) {
        return res.status(400).json({
          message: 'some of the data you provided is wrong please try again and refresh the page',
        });
      }

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, COALESCE(role, 'customer') AS role
    `;

      const values = [normalizedUsername, normalizedEmail, hashedPassword];
      const result = await pool.query(query, values);

      const user = result.rows[0];
      const token = createAuthToken(user);
      setAuthCookie(res, token);

      return res.status(201).json({
        message: 'User created',
        user,
      });
    } catch (err) {
      console.error('Signup error:', err.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const emailOk = EMAIL_REGEX.test(normalizedEmail);

      if (!emailOk) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      const result = await pool.query('SELECT id, username, email, password, COALESCE(role, \'customer\') AS role FROM users WHERE email = $1', [
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
      return res.json({
        message: 'Signed in',
        user: {
          id: Number(user.id),
          username: user.username,
          email: user.email,
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

  app.post('/api/auth/google', async (req, res) => {
    try {
      const requestOrigin = normalizeOrigin(req.headers.origin);
      if (requestOrigin && !isAllowedFrontendOrigin(requestOrigin, frontendOrigin)) {
        return res.status(403).json({ message: 'Blocked origin' });
      }

      const credential = String(req.body?.credential || '').trim();
      if (!credential) {
        return res.status(400).json({ message: 'Missing Google credential' });
      }

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
        `SELECT id, username, email, google_sub, COALESCE(role, 'customer') AS role
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
             RETURNING id, username, email, google_sub, COALESCE(role, 'customer') AS role`,
            [email, matchedBySub.id]
          );
          user = updatedEmailUser.rows[0];
        } else {
          user = matchedBySub;
        }
      } else {
        const existingByEmail = await pool.query(
        `SELECT id, username, email, google_sub, COALESCE(role, 'customer') AS role
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
               RETURNING id, username, email, google_sub, COALESCE(role, 'customer') AS role`,
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
             RETURNING id, username, email, google_sub, COALESCE(role, 'customer') AS role`,
            [usernameCandidate, email, hashedPassword, googleSub]
          );
          user = inserted.rows[0];
        }
      }

      const token = createAuthToken(user);
      setAuthCookie(res, token);

      return res.json({
        message: 'Signed in with Google',
        user: {
          id: Number(user.id),
          username: user.username,
          email: user.email,
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
    return res.json({message: 'Signed out'});
  });

  app.get('/api/auth', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser?.id) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const userResult = await pool.query(
        `SELECT id, username, email, COALESCE(role, 'customer') AS role
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
          role: user.role,
        },
        message: 'Authentication successfully',
      });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  });
};
