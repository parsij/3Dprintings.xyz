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
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

async function calculateTaxAndAuthentication(req, res) {
  const auth = isAuthenticatedAnIisValid(req, res, "cart");
  if (!auth?.userId) return;
  const userId = auth.userId;

  try {
    const address = req.body?.address;
    if (!address || typeof address !== "object") {
      return res.status(400).json({ message: "Missing address." });
    }
    const { zip, state, country } = address;
    if (!zip || !state || !country) {
      return res.status(400).json({ message: "Invalid address." });
    }

    const cartResult = await pool.query(
      `SELECT COALESCE(cart_json::jsonb, '{}'::jsonb) as cart_json FROM users WHERE id = $1`,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const cart = cartResult.rows[0].cart_json || {};
    const productIdNum = Number(auth.productId);
    const qty = auth.quantity === undefined ? 1 : Number(auth.quantity);

    const productResult = await pool.query(
      `SELECT id, name, current_price FROM products WHERE id = $1`,
      [productIdNum]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult.rows[0];
    const unitPrice = Number(product.current_price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return res.status(500).json({ message: "Invalid product price." });
    }

    const itemPrice = Math.round(unitPrice * 100) * qty;

    // use server side payment do not trust the user for price
    const calculation = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: [
        {
          amount: itemPrice, // e.g., 2500 for $25.00
          reference: String(productIdNum),
          tax_code: 'txcd_99999999', // The "Physical Goods" code
        },
      ],
      customer_details: {
        address: {
          postal_code: zip,
          state: state,
          country: country,
        },
        address_source: 'shipping',
      },
    });

    const tax = calculation.tax_amount_exclusive;
    const subtotal = itemPrice + tax;
    console.log(calculation);
    console.log(calculation.tax_breakdown);

    // Make the customer pay the exact fee (2.9% + 30c)
    const grandTotal = Math.ceil((subtotal + 30) / (1 - 0.029));
    const fee = grandTotal - subtotal;

    return res.json({
      cart,
      productId: productIdNum,
      quantity: qty,
      unitPrice,
      productPrice: itemPrice,
      salesTax: tax,
      processingFee: fee,
      totalToPay: grandTotal
    });
  } catch (error) {
    console.error('Error calculating tax:');
    console.log(error);
    return res.status(500).json({ message: 'Server error' });
  }
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
    let rating;
    let content;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated ' });
    }
    switch (type) {

      case "cart":
        rejexValue = /^\d+$/;
            productId = req.body?.productId?.toString?.();
            if (!productId || !rejexValue.test(productId)) {
              return res.status(401).json({ message: 'Invalid Values TYPE_ERROR_PRODUCTID' });
            }
            if (parseInt(productId, 10) <= 0) {
              return res.status(401).json({ message: 'Invalid Values TYPE_ERROR_PRODUCTID' });
            }

            if (req.body?.quantity !== undefined) {
              quantity = parseInt(req.body.quantity, 10);
              if (!rejexValue.test(quantity.toString())) {
                return res.status(401).json({ message: 'Invalid Values TYPE_ERROR_QUANTITY' });
              }
              if (quantity <= 0) {
                return res.status(401).json({ message: 'Invalid Values TYPE_ERROR_QUANTITY' });
              }
            } else {
              quantity = undefined;
            }
          break;
          case "nothing" :
            rejexValue = /^[\s\S]*$/;
            break;
          case "reviews":
            rejexValue = /^\d+$/;
            rating = parseInt(req.body?.rating, 10);
            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
              return res.status(400).json({ message: 'Rating must be between 1 and 5' });
            }

            content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
            break;
          case "create":
            rejexValue = /^[a-zA-Z0-9 ]+$/;
            let fieldErrors = {};
            let modelName = (req.body?.modelName || '').trim();
            if (modelName.length < 3) {
              fieldErrors.modelName = 'Model name must be at least 3 characters.';
            } else if (!rejexValue.test(modelName)) {
              fieldErrors.modelName = 'Model name can only contain letters, numbers, and spaces.';
            }

            let description = (req.body?.description || '').trim();
            if (description.length < 20) {
              fieldErrors.description = 'Description must be at least 20 characters.';
            }

            let price = Number(req.body?.price);
            if (!req.body?.price || Number.isNaN(price) || price <= 0) {
              fieldErrors.price = 'Enter a valid price greater than 0.';
            }

            if (Object.keys(fieldErrors).length > 0) {
              return res.status(400).json({ message: 'Validation failed.', errors: fieldErrors });
            }
            break;
      // More cases later if I want
      default:
        console.error("Unknown type: " + type);
        rejexValue = /.*/; // fallback regex that matches anything
    }
  return { userId, productId, rejexValue, quantity, rating, content };
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
  calculateTax: calculateTaxAndAuthentication,
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
