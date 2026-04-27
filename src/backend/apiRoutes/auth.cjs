const bcrypt = require('bcrypt');

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

      const hashedPassword = await bcrypt.hash(password, 8);

      const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email
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

      const result = await pool.query('SELECT id, username, email, password FROM users WHERE email = $1', [
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
        user: { username: user.username, email: user.email },
      });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({ message: 'Server error' });
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
      const user = getAuthUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      return res.json({ user, message: 'Authentication successfully' });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  });
};

