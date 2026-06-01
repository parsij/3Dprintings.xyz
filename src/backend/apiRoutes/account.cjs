const bcrypt = require('bcrypt');
const Geocodio = require('geocodio-library-node');
const axios = require('axios');

const US_STATE_CODE_REGEX = /^[A-Z]{2}$/;
const US_POSTAL_CODE_REGEX = /^\d{5}(?:-\d{4})?$/;
const COARSE_GEOAPIFY_RESULT_TYPES = new Set([
  'country',
  'state',
  'city',
  'postcode',
  'county',
  'district',
  'suburb',
  'region',
]);

function normalizeText(value) {
  return value ? String(value).trim() : '';
}

function sanitizeStreetLine(value) {
  return normalizeText(value)
    .replace(/[\u00B7·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildGeocodioSuggestion(result) {
  const ac = result?.address_components || {};
  const number = normalizeText(ac.number);
  const predir = normalizeText(ac.predirectional);
  const street = normalizeText(ac.street);
  const suffix = normalizeText(ac.suffix);
  const city = normalizeText(ac.city);
  const state = normalizeText(ac.state).toUpperCase();
  const zip = normalizeText(ac.zip);
  const country = normalizeText(ac.country).toUpperCase();

  const streetAddress = [number, predir, street, suffix].filter(Boolean).join(' ');
  if (!streetAddress || !number || !street || !city || !state || !zip) {
    return null;
  }
  if (!US_STATE_CODE_REGEX.test(state) || !US_POSTAL_CODE_REGEX.test(zip)) {
    return null;
  }
  if (country && country !== 'US') {
    return null;
  }

  const formatted = sanitizeStreetLine(normalizeText(result?.formatted_address));
  return {
    formatted_address: formatted || [streetAddress, city, state, zip, 'US'].join(', '),
    address: {
      street_address: sanitizeStreetLine(streetAddress),
      city,
      state_province: state,
      postal_code: zip,
      country_code: 'US',
    },
  };
}

function extractFormattedStreetLine(formatted, houseNumber) {
  const firstSegment = normalizeText(formatted).split(',')[0];
  if (!firstSegment) return '';

  const num = normalizeText(houseNumber);
  if (num && !firstSegment.startsWith(num)) {
    return '';
  }

  return firstSegment;
}

function pickBestStreetLine(...candidates) {
  const lines = candidates
    .map((value) => sanitizeStreetLine(value))
    .filter(Boolean);
  if (lines.length === 0) return '';
  if (lines.length === 1) return lines[0];

  const suffixPattern = /\b(st|street|ave|avenue|blvd|boulevard|dr|drive|rd|road|ln|lane|ct|court|way|pl|place|cir|circle|trl|trail|pkwy|parkway|hwy|highway)\b\.?$/i;

  let best = lines[0];
  for (const line of lines.slice(1)) {
    const bestHasSuffix = suffixPattern.test(best);
    const lineHasSuffix = suffixPattern.test(line);

    if (lineHasSuffix && !bestHasSuffix) {
      best = line;
      continue;
    }
    if (bestHasSuffix && !lineHasSuffix) {
      continue;
    }
    if (line.length > best.length) {
      best = line;
    }
  }

  return best;
}

function buildGeoapifySuggestion(feature) {
  const properties = feature?.properties || {};
  const resultType = normalizeText(properties.result_type).toLowerCase();
  if (resultType && COARSE_GEOAPIFY_RESULT_TYPES.has(resultType)) {
    return null;
  }

  const houseNumber = normalizeText(properties.housenumber);
  const street = normalizeText(properties.street);
  const city = normalizeText(properties.city || properties.town || properties.village);
  const state = normalizeText(properties.state_code || properties.state).toUpperCase();
  const postcode = normalizeText(properties.postcode);
  const composedLine = [houseNumber, street].filter(Boolean).join(' ');
  const formattedLine = extractFormattedStreetLine(properties.formatted, houseNumber);
  const streetLine = pickBestStreetLine(composedLine, properties.address_line1, formattedLine);

  if (!streetLine || !houseNumber || !street || !city || !state || !postcode) {
    return null;
  }
  if (!US_STATE_CODE_REGEX.test(state) || !US_POSTAL_CODE_REGEX.test(postcode)) {
    return null;
  }

  return {
    displayAddress: [streetLine, city, state, postcode, 'US'].join(', '),
    houseNumber,
    street,
    streetLine,
    city,
    state,
    postcode,
  };
}

const noopMiddleware = (req, res, next) => next();

function accountRoutes(deps) {
  const {
    app,
    pool,
    getAuthUserFromRequest,
    createAuthToken,
    setAuthCookie,
    EMAIL_REGEX,
    PASSWORD_REGEX,
    accountPasswordRateLimiter = noopMiddleware,
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

      const suggestions = results.map(buildGeocodioSuggestion).filter(Boolean);

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
        timeout: 12000,
      });

      const features = Array.isArray(data?.features) ? data.features : [];
      const suggestions = features.map(buildGeoapifySuggestion).filter(Boolean);

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

      if (error?.code === 'ECONNABORTED') {
        console.warn('Geoapify autocomplete timeout');
        return res.json({ suggestions: [] });
      }

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
      const normalizedState = String(state_province).trim().toUpperCase();
      const normalizedPostal = String(postal_code).trim();
      const normalizedCountryInput = String(country_code).trim().toUpperCase();
      const normalizedCountry = normalizedCountryInput || 'US';

      if (!normalizedStreet || !normalizedCity || !normalizedState || !normalizedPostal) {
        return res.status(400).json({
          message: 'Please enter a full residential address (street, city, state, and ZIP code)',
        });
      }
      if (!/\d/.test(normalizedStreet)) {
        return res.status(400).json({ message: 'Street address must include a house or building number' });
      }

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
      if (!US_STATE_CODE_REGEX.test(normalizedState)) {
        return res.status(400).json({ message: 'State must be a 2-letter US code (e.g., CA)' });
      }
      if (!US_POSTAL_CODE_REGEX.test(normalizedPostal)) {
        return res.status(400).json({ message: 'ZIP code must be valid (e.g., 94107 or 94107-1234)' });
      }
      if (normalizedCountry !== 'US') {
        return res.status(400).json({ message: 'Only US residential addresses are supported' });
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

       const { username, email, phone_number } = req.body;

       if (!username || !email) {
         return res.status(400).json({ message: 'Username and email are required' });
       }

       const normalizedUsername = String(username).trim();
       const normalizedEmail = String(email).toLowerCase().trim();
       const normalizedPhone = phone_number ? String(phone_number).trim() : null;

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
         SET username = $1, email = $2, phone_number = $3
         WHERE id = $4
         RETURNING id, username, email, phone_number, COALESCE(role, 'customer') AS role
       `,
         [normalizedUsername, normalizedEmail, normalizedPhone, authUser.id]
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

  app.put('/api/account/password', accountPasswordRateLimiter, async (req, res) => {
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

      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

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
}

accountRoutes.__private = {
  buildGeocodioSuggestion,
  buildGeoapifySuggestion,
};

module.exports = accountRoutes;
