const bcrypt = require('bcrypt');
const Geocodio = require('geocodio-library-node');
const axios = require('axios');

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

  const geocodioApiKey = process.env.GEOCODIO_API_KEY;
  const geocoder = geocodioApiKey ? new Geocodio(geocodioApiKey) : null;
  const geoapifyApiKey = process.env.GEOAPIFY_API_KEY;

  app.get('/api/account/address', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const result = await pool.query(
        `SELECT street_address, city, state_province, postal_code, country_code
         FROM users
         WHERE id = $1`,
        [authUser.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ address: result.rows[0] });
    } catch (error) {
      if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid token' });
      }

      console.error('Address fetch error:', error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/account/address/suggest', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      if (!geocoder) {
        return res.status(500).json({ message: 'Missing GEOCODIO_API_KEY on server.' });
      }

      const q = String(req.query?.q || '').trim();
      const limitRaw = String(req.query?.limit || '5').trim();
      const limit = Math.min(10, Math.max(1, Number.parseInt(limitRaw, 10) || 5));

      if (q.length < 3) {
        return res.json({ suggestions: [] });
      }

      const response = await geocoder.geocode(q, [], limit);
      const results = Array.isArray(response?.results) ? response.results : [];

      const suggestions = results
        .map((r) => {
          const ac = r?.address_components || {};
          const number = ac.number ? String(ac.number).trim() : '';
          const predir = ac.predirectional ? String(ac.predirectional).trim() : '';
          const street = ac.street ? String(ac.street).trim() : '';
          const suffix = ac.suffix ? String(ac.suffix).trim() : '';
          const city = ac.city ? String(ac.city).trim() : '';
          const state = ac.state ? String(ac.state).trim() : '';
          const zip = ac.zip ? String(ac.zip).trim() : '';
          const country = ac.country ? String(ac.country).trim() : '';

          const street_address = [number, predir, street, suffix].filter(Boolean).join(' ');
          const formatted = r?.formatted_address ? String(r.formatted_address) : '';

          return {
            formatted_address: formatted || [street_address, city, state, zip, country].filter(Boolean).join(', '),
            address: {
              street_address,
              city,
              state_province: state,
              postal_code: zip,
              country_code: country,
            },
          };
        })
        .filter((s) => s.formatted_address);

      return res.json({ suggestions });
    } catch (error) {
      if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid token' });
      }

      console.error('Address suggest error:', error?.message || error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/address/autocomplete', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      if (!geoapifyApiKey) {
        return res.status(500).json({ message: 'Missing GEOAPIFY_API_KEY on server.' });
      }

      const q = String(req.query?.q || '').trim();
      const limitRaw = String(req.query?.limit || '6').trim();
      const limit = Math.min(10, Math.max(1, Number.parseInt(limitRaw, 10) || 6));

      if (q.length < 3) {
        return res.json({ suggestions: [] });
      }

      const { data } = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
        params: {
          text: q,
          limit,
          filter: 'countrycode:us',
          bias: 'countrycode:us',
          apiKey: geoapifyApiKey,
        },
        timeout: 8000,
      });

      const features = Array.isArray(data?.features) ? data.features : [];
      const suggestions = features
        .map((f) => {
          const p = f?.properties || {};

          const houseNumber = p.housenumber ? String(p.housenumber) : '';
          const street = p.street ? String(p.street) : '';
          const city = p.city ? String(p.city) : '';
          const state = p.state_code ? String(p.state_code) : p.state ? String(p.state) : '';
          const postcode = p.postcode ? String(p.postcode) : '';

          const line1 = [houseNumber, street].filter(Boolean).join(' ');
          const displayAddress = [line1, city, state, postcode, 'US'].filter(Boolean).join(', ');

          return {
            displayAddress,
            houseNumber,
            street,
            city,
            state,
            postcode,
          };
        })
        .filter((s) => s.displayAddress);

      return res.json({ suggestions });
    } catch (error) {
      if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Server error';

      console.error('Geoapify autocomplete error:', message);
      return res.status(500).json({ message: 'Could not autocomplete address right now.' });
    }
  });

  app.put('/api/account/address', async (req, res) => {
    try {
      const authUser = getAuthUserFromRequest(req);
      if (!authUser) {
        return res.status(401).json({ message: 'Not signed in' });
      }

      const {
        street_address = '',
        city = '',
        state_province = '',
        postal_code = '',
        country_code = '',
      } = req.body || {};

      const normalizedStreet = String(street_address).trim();
      const normalizedCity = String(city).trim();
      const normalizedState = String(state_province).trim();
      const normalizedPostal = String(postal_code).trim();
      const normalizedCountry = String(country_code).trim().toUpperCase();

      if (normalizedStreet.length > 200) {
        return res.status(400).json({ message: 'Street address is too long' });
      }
      if (normalizedCity.length > 120) {
        return res.status(400).json({ message: 'City is too long' });
      }
      if (normalizedState.length > 120) {
        return res.status(400).json({ message: 'State/Province is too long' });
      }
      if (normalizedPostal.length > 30) {
        return res.status(400).json({ message: 'Postal code is too long' });
      }
      if (normalizedCountry && !/^[A-Z]{2}$/.test(normalizedCountry)) {
        return res.status(400).json({ message: 'Country code must be a 2-letter code (e.g., US)' });
      }

      const updated = await pool.query(
        `
        UPDATE users
        SET
          street_address = $1,
          city = $2,
          state_province = $3,
          postal_code = $4,
          country_code = $5
        WHERE id = $6
        RETURNING street_address, city, state_province, postal_code, country_code
      `,
        [
          normalizedStreet || null,
          normalizedCity || null,
          normalizedState || null,
          normalizedPostal || null,
          normalizedCountry || null,
          authUser.id,
        ]
      );

      if (updated.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        message: 'Address updated.',
        address: updated.rows[0],
      });
    } catch (error) {
      if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid token' });
      }

      console.error('Address update error:', error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });

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

