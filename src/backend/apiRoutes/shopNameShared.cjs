const SHOP_NAME_MIN_LENGTH = 3;
const SHOP_NAME_MAX_LENGTH = 20;
const SHOP_NAME_PATTERN = /^[A-Za-z0-9]+$/;

function normalizeShopName(value) {
  return String(value || "").trim();
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
  const name = normalizeShopName(shopName);
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
  return result.rows.length === 0;
}

module.exports = {
  SHOP_NAME_MAX_LENGTH,
  SHOP_NAME_MIN_LENGTH,
  SHOP_NAME_PATTERN,
  isShopNameAvailable,
  normalizeShopName,
  validateShopName,
};
