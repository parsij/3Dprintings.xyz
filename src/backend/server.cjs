const express = require('express');
const app = express();
const pool = require("./db.cjs");
const cors = require('cors');
const bcrypt = require("bcrypt");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const uploadDir = path.join(__dirname, "imgUploads");
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET. Add it to src/backend/.env");
}

fs.mkdirSync(uploadDir, { recursive: true });

function sanitizeFileName(fileName) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function cleanupUploadedFiles(files = []) {
  await Promise.all(
    files
      .filter((file) => file?.path)
      .map((file) => fs.promises.unlink(file.path).catch(() => null))
  );
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const originalExt = path.extname(file.originalname || "").toLowerCase();
      const safeName = sanitizeFileName(path.basename(file.originalname || "photo", originalExt)) || "photo";
      const ext = originalExt || ".jpg";
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}${ext}`;
      cb(null, uniqueName);
    },
  }),
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
  origin: true, // Echoes back the requesting origin
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use("/imgUploads", express.static(uploadDir));

function createAuthToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: "365d" }
  );
}

function setAuthCookie(res, token) {
  // Use Lax for localhost/IP development without HTTPS
  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // Must be false for HTTP (IP address)
    sameSite: "lax", // Lax works for same-site (same IP, different port)
    maxAge: 93 * 24 * 60 * 60 * 1000,
    path: "/", // Ensure cookie is available for all paths
  });
}

function isAuthenticatedAnIisValid(req, res, type = "cart") {
  try {
    const userId = getAuthUserFromRequest(req)?.id;
    let rejexValue;
    let productId;
    let quantity;
    switch (type) {

      case "cart":
        rejexValue = /^\d+$/;
            productId = req.body.productId.toString();
            quantity = parseInt(req.body.quantity, 10);
        break;
      // More cases later if I want
      default:
        console.error("Unknown type: " + type);
        rejexValue = /.*/; // fallback regex that matches anything
    }
    if (!userId || !productId || !rejexValue.test(productId) || !rejexValue.test(quantity.toString())) {
      return res.status(401).json({ message: 'User not authenticated or invalid productId.' });
    }
  return { userId, productId, rejexValue, quantity };
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
}

function clearAuthCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  });
}

function getAuthUserFromRequest(req) {
  const token = req.cookies.token;
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

require(path.join(__dirname, "apiRoutes", "index.cjs"))({
  app,
  pool,
  upload,
  cleanupUploadedFiles,
  JWT_SECRET,
  createAuthToken,
  setAuthCookie,
  clearAuthCookie,
  getAuthUserFromRequest,
  isAuthenticatedAnIisValid,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  MAX_PHOTOS,
  MAX_PHOTO_SIZE,
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

app.listen(3000, '0.0.0.0', () => {
  console.log('Server is running on http://0.0.0.0:3000');
});
