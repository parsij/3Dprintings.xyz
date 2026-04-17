const express = require('express');
const app = express();
const pool = require("./db.cjs");
const cors = require('cors');
const bcrypt = require("bcrypt");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_PHOTOS,
    fileSize: MAX_PHOTO_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

function createAuthToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "93d" }
  );
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 93 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
  });
}

function getAuthUserFromRequest(req) {
  const token = req.cookies.token;
  if (!token) {
    return null;
  }

  return jwt.verify(token, process.env.JWT_SECRET);
}

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
        message: 'some of the data you provided is wrong please try again and refresh the page'
      });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already in use" });
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

    const result = await pool.query(
      "SELECT id, username, email, password FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = createAuthToken(user);
    setAuthCookie(res, token);
    return res.json({
      message: "Signed in",
      user: { username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post('/api/signout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ message: "Signed out" });
});

app.get('/api/auth', async (req, res) => {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Not signed in" });
    }

    return res.json({ user , message: 'Authentication successfully' });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

app.put('/api/account/profile', async (req, res) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ message: "Not signed in" });
    }

    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "Username and email are required" });
    }

    const normalizedUsername = String(username).trim();
    const normalizedEmail = String(email).toLowerCase().trim();

    if (normalizedUsername.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingEmail = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id <> $2",
      [normalizedEmail, authUser.id]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ message: "Email already in use" });
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
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = updatedUserResult.rows[0];
    const token = createAuthToken(updatedUser);
    setAuthCookie(res, token);

    return res.json({
      message: "Account profile updated.",
      user: updatedUser,
    });
  } catch (error) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid token" });
    }

    console.error("Profile update error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put('/api/account/password', async (req, res) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ message: "Not signed in" });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message: "New password must include uppercase, lowercase, number, and be at least 8 characters",
      });
    }

    const userResult = await pool.query(
      "SELECT id, password FROM users WHERE id = $1",
      [authUser.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];
    const passwordMatches = await bcrypt.compare(oldPassword, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 8);

    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedNewPassword, authUser.id]
    );

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid token" });
    }

    console.error("Password update error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/create", upload.array("photos", MAX_PHOTOS), async (req, res) => {
  try {
    const { modelName = "", description = "", price, category = "", tags, userId } = req.body;
    const photos = req.files || [];
    const parsedPrice = Number(price);

    const fieldErrors = {};

    if (modelName.trim().length < 3) {
      fieldErrors.modelName = "Model name must be at least 3 characters.";
    }

    if (description.trim().length < 20) {
      fieldErrors.description = "Description must be at least 20 characters.";
    }

    if (!price || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      fieldErrors.price = "Enter a valid price greater than 0.";
    }

    if (photos.length === 0) {
      fieldErrors.photos = "Upload at least one printed model photo.";
    }

    if (photos.length > MAX_PHOTOS) {
      fieldErrors.photos = `You can upload up to ${MAX_PHOTOS} photos.`;
    }

    if (!userId) {
      fieldErrors.userId = "Missing user id.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: fieldErrors,
      });
    }

    let parsedTags = [];
    if (typeof tags === "string" && tags.trim().length > 0) {
      try {
        const rawTags = JSON.parse(tags);
        if (Array.isArray(rawTags)) {
          parsedTags = rawTags.map((tag) => String(tag).trim()).filter(Boolean);
        }
      } catch {
        parsedTags = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }

    const insertProductQuery = `
      INSERT INTO products (
        name,
        description,
        original_price,
        current_price,
        rating,
        user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, original_price, current_price, rating, user_id
    `;

    const productValues = [
      modelName.trim(),
      description.trim(),
      parsedPrice,
      parsedPrice,
      null,
      userId
    ];

    const productResult = await pool.query(insertProductQuery, productValues);

    return res.status(201).json({
      message: "Listing saved.",
      product: productResult.rows[0],
      category: category.trim() || null,
      tags: parsedTags,
      photoCount: photos.length,
      photos: photos.map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      })),
    });
  } catch (error) {
    console.error("Create listing error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/tags", async (req, res) => {
  try {
  const tag = String(req.query.tag || "").toLowerCase().trim();
  const isLettersOnly = /^[a-z]+$/ .test(tag);
    if (!isLettersOnly) {
    return res.status(400).json({message: "unallowed characters"});}
        const result = await pool.query(
            `
      SELECT tag_name, uses
      FROM tags
      WHERE tag_name ILIKE '%' || $1 || '%'
      ORDER BY uses DESC
      LIMIT 5
      `,
      [tag]
    );

    if (result.rows.length === 0) {
      return res.json({tagsAndUses:[{tag_name:tag, uses: 0}]})
    }
    return res.json({
      tagsAndUses: result.rows
    })
  }
    catch (error) {
    console.error(error)
    return res.status(500).json({ message: "server error" });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Each photo must be 5MB or less." });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: `You can upload up to ${MAX_PHOTOS} photos.` });
    }
  }

  if (error?.message === "Only image files are allowed.") {
    return res.status(400).json({ message: error.message });
  }

  return next(error);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});