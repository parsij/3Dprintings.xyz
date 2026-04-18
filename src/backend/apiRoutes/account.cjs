const bcrypt = require('bcrypt');

module.exports = function accountRoutes(deps) {
  const {
    app,
    pool,
    getAuthUserFromRequest,
    createAuthToken,
    setAuthCookie,
    EMAIL_REGEX,
    PASSWORD_REGEX,
  } = deps;

  app.put('/api/account/profile', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const { username, email } = req.body;

      if (!username || !email) {
        return res.status(400).json({ message: 'Username and email are required' });
      }

      const normalizedUsername = String(username).trim();
      const normalizedEmail = String(email).toLowerCase().trim();

      if (normalizedUsername.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters' });
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [
        normalizedEmail,
        authUser.id,
      ]);

      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      const updatedUserResult = await pool.query(
        `
        UPDATE users
        SET username = $1, email = $2
        WHERE id = $3
        RETURNING id, username, email
      `,
        [normalizedUsername, normalizedEmail, authUser.id]
      );

      if (updatedUserResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updatedUser = updatedUserResult.rows[0];
      const token = createAuthToken(updatedUser);
      setAuthCookie(res, token);

      return res.json({
        message: 'Account profile updated.',
        user: updatedUser,
      });
    } catch (error) {
      if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid token' });
      }

      console.error('Profile update error:', error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/account/password', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({
          message: 'New password must include uppercase, lowercase, number, and be at least 8 characters',
        });
      }

      const userResult = await pool.query('SELECT id, password FROM users WHERE id = $1', [authUser.id]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = userResult.rows[0];
      const passwordMatches = await bcrypt.compare(oldPassword, user.password);

      if (!passwordMatches) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const samePassword = await bcrypt.compare(newPassword, user.password);
      if (samePassword) {
        return res.status(400).json({ message: 'New password must be different from current password' });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 8);

      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, authUser.id]);

      return res.json({ message: 'Password updated successfully.' });
    } catch (error) {
      if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid token' });
      }

      console.error('Password update error:', error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};

