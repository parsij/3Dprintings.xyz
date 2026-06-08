const SHOP_NAME_MIN_LENGTH = 3;
const SHOP_NAME_MAX_LENGTH = 20;
const SHOP_NAME_PATTERN = /^[A-Za-z0-9]+$/;
const DEFAULT_SHOP_NAME_SUGGESTION_COUNT = 5;

function normalizeShopName(value) {
  return String(value || "").trim().toLowerCase();
}

function validateShopName(value) {
  const name = normalizeShopName(value);

  if (name.length < SHOP_NAME_MIN_LENGTH) {
    return `Shop name must be between ${SHOP_NAME_MIN_LENGTH} and ${SHOP_NAME_MAX_LENGTH} characters.`;
  }

  if (name.length > SHOP_NAME_MAX_LENGTH) {
    return `Shop name must be between ${SHOP_NAME_MIN_LENGTH} and ${SHOP_NAME_MAX_LENGTH} characters.`;
  }

  if (!SHOP_NAME_PATTERN.test(name)) {
    return "Shop name can only contain letters and numbers.";
  }

  return "";
}

async function isShopNameAvailable(pool, shopName, excludeSellerUserId = null) {
  const name = (normalizeShopName(shopName));
  const params = [name.toLowerCase()];
  let query = `
    SELECT seller_user_id
    FROM seller_profiles
    WHERE lower(shop_name) = $1
  `;

  if (excludeSellerUserId != null) {
    params.push(Number(excludeSellerUserId));
    query += " AND seller_user_id <> $2";
  }

  query += " LIMIT 1";
  const result = await pool.query(query, params);
  return result.rowCount === 0;
}

function sanitizeShopNameSuggestion(value) {
  return normalizeShopName(value).replace(/[^A-Za-z0-9]/g, "").slice(0, SHOP_NAME_MAX_LENGTH);
}

function fitShopNameParts(prefix, base, suffix) {
  const safePrefix = sanitizeShopNameSuggestion(prefix);
  const safeBase = sanitizeShopNameSuggestion(base) || "PrintShop";
  const safeSuffix = sanitizeShopNameSuggestion(suffix);
  const reservedLength = safePrefix.length + safeSuffix.length;
  const baseLength = Math.max(SHOP_NAME_MIN_LENGTH, SHOP_NAME_MAX_LENGTH - reservedLength);
  return `${safePrefix}${safeBase.slice(0, baseLength)}${safeSuffix}`.slice(0, SHOP_NAME_MAX_LENGTH);
}

function buildFallbackShopNameSuggestions(shopName, limit = 40) {
  const base = sanitizeShopNameSuggestion(shopName) || "PrintShop";
  const suffixes = ["Studio", "Prints", "Forge", "Works", "Lab", "Makers", "Market", "Depot", "Hub", "Designs"];
  const prefixes = ["Maker", "Print", "Model", "Craft", "Layer"];
  const candidates = [];

  suffixes.forEach((suffix) => {
    candidates.push(fitShopNameParts("", base, suffix));
  });

  prefixes.forEach((prefix) => {
    candidates.push(fitShopNameParts(prefix, base, ""));
  });

  for (let index = 2; candidates.length < limit && index < 1000; index += 1) {
    candidates.push(fitShopNameParts("", base, String(index)));
  }

  return candidates;
}

function normalizeCandidateList(candidates) {
  if (!Array.isArray(candidates)) return [];
  return candidates
    .map(sanitizeShopNameSuggestion)
    .filter((candidate) => candidate && !validateShopName(candidate));
}

async function generateAvailableShopNameAlternatives(pool, shopName, options = {}) {
  const desiredCount = Math.min(
    Math.max(Number(options.count) || DEFAULT_SHOP_NAME_SUGGESTION_COUNT, 1),
    10
  );
  const excludeSellerUserId = options.excludeSellerUserId ?? null;
  const originalName = normalizeShopName(shopName).toLowerCase();
  const seen = new Set([originalName]);
  const candidates = [];

  [...normalizeCandidateList(options.candidates), ...buildFallbackShopNameSuggestions(shopName)].forEach((candidate) => {
    const key = candidate.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  });

  if (candidates.length === 0) return [];

  const lowerCandidates = candidates.map((candidate) => candidate.toLowerCase());
  const params = [lowerCandidates];
  let query = `
    SELECT lower(shop_name) AS shop_name
    FROM seller_profiles
    WHERE lower(shop_name) = ANY($1)
  `;

  if (excludeSellerUserId != null) {
    params.push(Number(excludeSellerUserId));
    query += " AND seller_user_id <> $2";
  }

  const result = await pool.query(query, params);
  const unavailable = new Set(result.rows.map((row) => String(row.shop_name || "").toLowerCase()));

  return candidates
    .filter((candidate) => !unavailable.has(candidate.toLowerCase()))
    .slice(0, desiredCount);
}

module.exports = {
  DEFAULT_SHOP_NAME_SUGGESTION_COUNT,
  SHOP_NAME_MAX_LENGTH,
  SHOP_NAME_MIN_LENGTH,
  SHOP_NAME_PATTERN,
  generateAvailableShopNameAlternatives,
  isShopNameAvailable,
  normalizeShopName,
  validateShopName,
};
