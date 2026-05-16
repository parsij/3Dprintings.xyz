const express = require('express');
const path = require("path");
const { spawn } = require('child_process');
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
app.set("trust proxy", 1);
const pool = require("./db.cjs");
const cors = require('cors');
const bcrypt = require("bcrypt");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ensureSellerDashboardTable } = require("./apiRoutes/sellerShared.cjs");
const STRIPE_WEBHOOK_SECRET_PATTERN = /whsec_[a-zA-Z0-9]+/;

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const uploadDir = path.join(__dirname, "imgUploads");
const JWT_SECRET = process.env.JWT_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || ".3dprintings.xyz";

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET. Add it to user/backend/.env");
}

fs.mkdirSync(uploadDir, { recursive: true });

function formatSecretForLogs(secret) {
  if (!secret) return "(missing)";
  if (secret.length <= 12) return secret;
  return `${secret.slice(0, 8)}...${secret.slice(-4)}`;
}

function syncWebhookSecretFromStripeCliOutput(outputText) {
  const match = outputText.match(STRIPE_WEBHOOK_SECRET_PATTERN);
  if (!match) return;

  const discoveredSecret = match[0];
  if (process.env.STRIPE_WEBHOOK_SECRET === discoveredSecret) return;

  process.env.STRIPE_WEBHOOK_SECRET = discoveredSecret;
  console.log(`🔐 Stripe webhook secret synced from Stripe CLI: ${formatSecretForLogs(discoveredSecret)}`);
}

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

const defaultAllowedOrigins = [
  "https://3dprintings.xyz",
  'https://www.3dprintings.xyz',
  "https://seller.3dprintings.xyz",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const envAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

function isAllowedOrigin(origin) {
  if (allowedOrigins.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".3dprintings.xyz");
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// We must apply the webhook route BEFORE express.json() because Stripe needs the raw body
app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  if (!webhookSecret) {
      console.error('Webhook signature verification skipped: missing STRIPE_WEBHOOK_SECRET.');
      return response.status(500).send('Webhook Error: missing STRIPE_WEBHOOK_SECRET');
  }

  if (!sig) {
      return response.status(400).send('Webhook Error: missing Stripe-Signature header');
  }

  try {
      event = stripe.webhooks.constructEvent(
          request.body,
          sig,
          webhookSecret
      );
  } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
      if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const orderId = session.metadata?.orderId;

          if (orderId) {
              let paymentType = 'card';
              if (session.payment_method) {
                  const paymentMethod = await stripe.paymentMethods.retrieve(session.payment_method);
                  if (paymentMethod.type === 'card') {
                      paymentType = paymentMethod.card.brand || 'card';
                  } else if (paymentMethod.type === 'ideal') {
                      paymentType = 'iDEAL';
                  } else if (paymentMethod.type === 'klarna') {
                      paymentType = 'Klarna';
                  } else if (paymentMethod.type === 'sepa_debit') {
                      paymentType = 'SEPA Debit';
                  } else if (paymentMethod.type === 'ach_debit') {
                      paymentType = 'ACH Debit';
                  } else {
                      paymentType = paymentMethod.type || 'card';
                  }
              }

              await pool.query(
                  `UPDATE orders SET status = 'completed', payment_type = $1, updated_at = NOW() WHERE id = $2`,
                  [paymentType, orderId]
              );
              console.log(`Order ${orderId} marked as completed with payment type: ${paymentType}`);

              // Clear cart for this order's customer. Prefer explicit userId metadata, fallback to DB lookup.
              let userId = session.metadata?.userId;
              if (!userId) {
                  const ownerResult = await pool.query(
                      `SELECT customer_id FROM orders WHERE id = $1`,
                      [orderId]
                  );
                  userId = ownerResult.rows[0]?.customer_id;
              }
              if (userId) {
                  await pool.query(
                      `UPDATE users SET cart_json = '{}'::jsonb WHERE id = $1`,
                      [userId]
                  );
                  console.log(`Cart cleared for user ${userId}.`);
              }
          }
      }

      response.json({ received: true });
  } catch (err) {
      console.error('Error processing webhook:', err);
      response.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.use(express.json());
app.use(cookieParser());
app.use("/imgUploads", express.static(uploadDir));
app.use("/api/imgUploads", express.static(uploadDir));

function createAuthToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: "365d" }
  );
}

function setAuthCookie(res, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    maxAge: 93 * 24 * 60 * 60 * 1000,
    path: "/",
  };
  if (AUTH_COOKIE_DOMAIN) {
    cookieOptions.domain = AUTH_COOKIE_DOMAIN;
  }
  res.cookie("token", token, cookieOptions);
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
  const cookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
  };
  if (AUTH_COOKIE_DOMAIN) {
    cookieOptions.domain = AUTH_COOKIE_DOMAIN;
  }
  res.clearCookie("token", cookieOptions);
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
  stripe,
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

  if (typeof error?.message === "string" && error.message.startsWith("CORS blocked for origin:")) {
    return res.status(403).json({ message: error.message });
  }

  return next(error);
});

// Initialize database tables
async function initializeDatabase() {
  try {
     // Add phone_number column if it doesn't exist
     await pool.query(`
       ALTER TABLE users
       ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)
     `);
     console.log('Phone number column ensured in users table');

     // Add Google identity column if it doesn't exist
     await pool.query(`
       ALTER TABLE users
       ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)
     `);
     console.log('Google identity column ensured in users table');

     await pool.query(`
       ALTER TABLE users
       ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer'
     `);
     console.log("User role column ensured in users table");

     await pool.query(`
       ALTER TABLE users
       ADD COLUMN IF NOT EXISTS seller_preferences JSONB NOT NULL DEFAULT '{}'::jsonb
     `);
     console.log("Seller preferences column ensured in users table");

     // Ensure Google identity cannot be linked to multiple users
     await pool.query(`
       CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
       ON users (google_sub)
       WHERE google_sub IS NOT NULL
     `);
     console.log(' Google identity unique index ensured');

     // Add payment_type column to orders if it doesn't exist
     await pool.query(`
       ALTER TABLE orders
       ADD COLUMN IF NOT EXISTS payment_type VARCHAR(100)
     `);
     console.log('ayment type column ensured in orders table');

     // Add stripe_session_id column to orders if it doesn't exist
     await pool.query(`
       ALTER TABLE orders
       ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255)
     `);
     console.log('Stripe session id column ensured in orders table');

     await pool.query(`
       ALTER TABLE reviews
       ADD COLUMN IF NOT EXISTS seller_reply TEXT
     `);
     await pool.query(`
       ALTER TABLE reviews
       ADD COLUMN IF NOT EXISTS seller_reply_updated_at TIMESTAMPTZ
     `);
     console.log("Seller reply columns ensured in reviews table");

     // Create orders table if it doesn't exist
     await pool.query(`
       CREATE TABLE IF NOT EXISTS orders (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         customer_id BIGINT NOT NULL,
         status VARCHAR(50) DEFAULT 'pending',
         total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
         items JSONB NOT NULL,
         shipping_address_id INT,
         payment_type VARCHAR(100),
         stripe_session_id VARCHAR(255),
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       );
     `);
    console.log('✅ Orders table initialized');

    await ensureSellerDashboardTable(pool);
    console.log("Seller dashboard metrics table ensured.");
  } catch (error) {
    console.error('⚠️ Error initializing database:', error.message);
  }
}

// Start Stripe Webhook Listener
function startStripeWebhookListener() {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'stripe.cmd' : 'stripe';

  const webhookProcess = spawn(command, ['listen', '--forward-to', '3dprintings.xyz/webhook'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows
  });

  webhookProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    syncWebhookSecretFromStripeCliOutput(text);
  });

  webhookProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    syncWebhookSecretFromStripeCliOutput(text);
  });

  webhookProcess.on('error', (error) => {
    console.warn('⚠Stripe webhook listener not available. Make sure Stripe CLI is installed and you are logged in.');
    console.warn('Install: https://stripe.com/docs/stripe-cli');
  });

  webhookProcess.on('close', (code) => {
    if (code !== 0) {
      console.warn('Webhook listener closed with code:', code);
    }
  });

  process.on('exit', () => {
    webhookProcess.kill();
  });
}

// Start server and services
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Start Express server
    app.listen(3000, '0.0.0.0', () => {
console.log("the Server is online.")
      // Start webhook listener in non-production so local webhook secrets stay in sync.
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔔 Starting Stripe Webhook Listener...');
        if (process.env.STRIPE_WEBHOOK_SECRET) {
          console.log(`   Using configured webhook secret: ${formatSecretForLogs(process.env.STRIPE_WEBHOOK_SECRET)}`);
        }
        startStripeWebhookListener();
      } else if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set. Webhooks will not work.');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
