function isTruthyEnv(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function isTestMode() {
  return isTruthyEnv(process.env.TEST_MODE);
}

function normalizeOrigin(origin) {
  return String(origin || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

function getFrontendUrl() {
  const configured = normalizeOrigin(process.env.FRONTEND_URL);
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    return "https://3dprintings.xyz";
  }
  return isTestMode() ? "http://localhost:5173" : "https://3dprintings.xyz";
}

function getSellerFrontendUrl() {
  const configured = normalizeOrigin(process.env.SELLER_FRONTEND_URL);
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    return "https://seller.3dprintings.xyz";
  }
  if (isTestMode()) return "http://seller.localhost:5173";
  return "https://seller.3dprintings.xyz";
}

function isLocalDevHostname(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

function getLocalDevOrigins() {
  const origins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://seller.localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://seller.localhost:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ]);

  const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL);
  const sellerFrontendUrl = normalizeOrigin(process.env.SELLER_FRONTEND_URL);

  if (frontendUrl) origins.add(frontendUrl);
  if (sellerFrontendUrl) origins.add(sellerFrontendUrl);

  for (const origin of (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean)) {
    origins.add(origin);
  }

  return [...origins];
}

function isLocalDevOrigin(origin) {
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return isLocalDevHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function isProductionSiteOrigin(origin) {
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return false;
    return parsed.hostname === "3dprintings.xyz" || parsed.hostname.endsWith(".3dprintings.xyz");
  } catch {
    return false;
  }
}

function isAllowedAppOrigin(origin, allowedOriginsSet) {
  if (!origin) return true;
  if (allowedOriginsSet.has(origin)) return true;
  if (isProductionSiteOrigin(origin)) return true;
  if (isTestMode() && isLocalDevOrigin(origin)) return true;
  return false;
}

function isAllowedFrontendOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  const configuredFrontend = normalizeOrigin(process.env.FRONTEND_URL);
  const configuredSellerFrontend = normalizeOrigin(process.env.SELLER_FRONTEND_URL);

  if (configuredFrontend && normalized === configuredFrontend) return true;
  if (configuredSellerFrontend && normalized === configuredSellerFrontend) return true;
  if (isProductionSiteOrigin(normalized)) return true;
  if (isTestMode() && isLocalDevOrigin(normalized)) return true;

  return false;
}

function getServerPort() {
  const configured = Number(process.env.PORT);
  if (Number.isInteger(configured) && configured > 0) return configured;
  return 3000;
}

module.exports = {
  getFrontendUrl,
  getLocalDevOrigins,
  getSellerFrontendUrl,
  getServerPort,
  isAllowedAppOrigin,
  isAllowedFrontendOrigin,
  isLocalDevHostname,
  isLocalDevOrigin,
  isProductionSiteOrigin,
  isTestMode,
  normalizeOrigin,
};
