export const SHOP_NAME_MIN_LENGTH = 3;
export const SHOP_NAME_MAX_LENGTH = 20;
export const SHOP_NAME_PATTERN = /^[A-Za-z0-9]+$/;

export function normalizeShopName(value) {
  return String(value || "").trim();
}

export function validateShopName(value) {
  const name = normalizeShopName(value);

  if (name.length < SHOP_NAME_MIN_LENGTH) {
    return `Shop name must be at least ${SHOP_NAME_MIN_LENGTH} characters.`;
  }

  if (name.length > SHOP_NAME_MAX_LENGTH) {
    return `Shop name must be at most ${SHOP_NAME_MAX_LENGTH} characters.`;
  }

  if (!SHOP_NAME_PATTERN.test(name)) {
    return "Shop name can only contain letters and numbers.";
  }

  return "";
}

export function shopPath(shopName) {
  const name = normalizeShopName(shopName);
  if (!name) return null;
  return `/shop/${encodeURIComponent(name)}`;
}
