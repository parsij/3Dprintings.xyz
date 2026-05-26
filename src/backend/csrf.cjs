const { randomBytes, timingSafeEqual } = require("crypto");
const { isTestMode } = require("./envShared.cjs");

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_BYTES = 32;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function generateCsrfToken() {
  return randomBytes(CSRF_TOKEN_BYTES).toString("base64url");
}

function getCsrfCookieOptions() {
  const IS_PRODUCTION = process.env.NODE_ENV === "production";
  const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || (IS_PRODUCTION ? ".3dprintings.xyz" : "");
  const AUTH_COOKIE_MAX_AGE_DAYS = Number(process.env.AUTH_COOKIE_MAX_AGE_DAYS || 7);
  const AUTH_COOKIE_MAX_AGE_MS = AUTH_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const options = {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: "/",
  };

  if (AUTH_COOKIE_DOMAIN) {
    options.domain = AUTH_COOKIE_DOMAIN;
  }

  return options;
}

function setCsrfCookie(res, token = generateCsrfToken()) {
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
}

function clearCsrfCookie(res) {
  const expire = new Date(0);
  const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN
    || (process.env.NODE_ENV === "production" ? ".3dprintings.xyz" : "");
  const isProduction = process.env.NODE_ENV === "production";
  const domains = new Set([undefined]);

  if (authCookieDomain) domains.add(authCookieDomain);
  if (isProduction || isTestMode()) {
    domains.add(".3dprintings.xyz");
    domains.add("3dprintings.xyz");
  }
  if (!isProduction || isTestMode()) {
    domains.add("localhost");
    domains.add(".localhost");
  }

  const secureVariants = [
    { httpOnly: false, sameSite: "lax", path: "/", secure: false },
    { httpOnly: false, sameSite: "lax", path: "/", secure: true },
  ];

  for (const variant of secureVariants) {
    for (const domain of domains) {
      const options = domain ? { ...variant, domain } : variant;
      res.clearCookie(CSRF_COOKIE_NAME, options);
      res.cookie(CSRF_COOKIE_NAME, "", { ...options, expires: expire, maxAge: 0 });
    }
  }
}

function tokensMatch(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) return false;

  const cookieBuffer = Buffer.from(String(cookieToken));
  const headerBuffer = Buffer.from(String(headerToken));
  if (cookieBuffer.length !== headerBuffer.length) return false;

  return timingSafeEqual(cookieBuffer, headerBuffer);
}

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!tokensMatch(cookieToken, headerToken)) {
    return res.status(403).json({ message: "Invalid or missing CSRF token." });
  }

  return next();
}

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
  csrfProtection,
};
