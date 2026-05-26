const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const AVATAR_BACKGROUNDS = [
  { from: "#ffffff", to: "#86efac", text: "#166534" },
  { from: "#ffffff", to: "#fdba74", text: "#9a3412" },
  { from: "#ffffff", to: "#d8b4fe", text: "#6b21a8" },
  { from: "#ffffff", to: "#93c5fd", text: "#1e40af" },
  { from: "#ffffff", to: "#f9a8d4", text: "#9d174d" },
  { from: "#ffffff", to: "#fde68a", text: "#92400e" },
];

function hashString(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getShopInitial(shopName) {
  const match = String(shopName || "").trim().match(/[A-Za-z0-9]/);
  return (match ? match[0] : "?").toUpperCase();
}

function pickBackground(shopName) {
  return AVATAR_BACKGROUNDS[hashString(String(shopName || "").toLowerCase()) % AVATAR_BACKGROUNDS.length];
}

function extractUploadFileName(rawUrl) {
  const match = String(rawUrl || "").match(/\/(?:api\/)?imgUploads\/([^/?#]+)/i);
  return match ? match[1] : null;
}

function isGeneratedSellerAvatarReference(value) {
  return /seller-\d+-avatar-/i.test(String(value || ""));
}

function isCustomSellerAvatarReference(value) {
  return /seller-\d+-profile-/i.test(String(value || ""));
}

function shouldAutoGenerateSellerAvatar(currentLogoUrl, { shopName, shopNameChanged }) {
  if (!shopName || shopName.length < 3) return false;

  const logo = String(currentLogoUrl || "").trim();
  if (!logo) return true;
  if (shopNameChanged && isGeneratedSellerAvatarReference(logo)) return true;
  return false;
}

function buildAvatarSvg(shopName) {
  const initial = getShopInitial(shopName);
  const bg = pickBackground(shopName);
  const escapedInitial = initial
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg.from}"/>
      <stop offset="100%" stop-color="${bg.to}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="32" fill="url(#bg)"/>
  <text x="128" y="138" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="112" font-weight="700" fill="${bg.text}">${escapedInitial}</text>
</svg>`;
}

async function removeGeneratedAvatarFile(currentLogoUrl, uploadDir) {
  if (!isGeneratedSellerAvatarReference(currentLogoUrl)) return;

  const fileName = extractUploadFileName(currentLogoUrl);
  if (!fileName) return;

  await fs.promises.unlink(path.join(uploadDir, fileName)).catch(() => null);
}

async function generateSellerAvatarFile({ shopName, sellerId, uploadDir }) {
  const fileName = `seller-${sellerId}-avatar-${hashString(String(shopName || "").toLowerCase())}.png`;
  const filePath = path.join(uploadDir, fileName);
  const svg = buildAvatarSvg(shopName);

  await sharp(Buffer.from(svg)).png().toFile(filePath);

  return { fileName, filePath };
}

async function createSellerAvatarLogoUrl({
  shopName,
  sellerId,
  currentLogoUrl,
  uploadDir,
  buildImageUrl,
  req,
}) {
  await removeGeneratedAvatarFile(currentLogoUrl, uploadDir);
  const { fileName } = await generateSellerAvatarFile({ shopName, sellerId, uploadDir });
  return buildImageUrl(req, fileName);
}

async function resolveSellerLogoUrlForSave({
  sellerId,
  shopName,
  shopNameChanged,
  submittedLogoUrl,
  existingLogoUrl,
  uploadDir,
  buildImageUrl,
  req,
}) {
  const existing = String(existingLogoUrl || "").trim();
  const submitted = String(submittedLogoUrl || "").trim();

  if (isCustomSellerAvatarReference(existing) && !submitted) {
    return existing;
  }

  if (shouldAutoGenerateSellerAvatar(existing, { shopName, shopNameChanged })) {
    return createSellerAvatarLogoUrl({
      shopName,
      sellerId,
      currentLogoUrl: existing,
      uploadDir,
      buildImageUrl,
      req,
    });
  }

  if (submitted) return submitted;
  return existing;
}

async function persistSellerLogoUrl(pool, sellerId, imageUrl) {
  if (!imageUrl) return;

  await pool.query(
    `UPDATE seller_profiles
     SET shop_logo_url = $1,
         updated_at = NOW()
     WHERE seller_user_id = $2`,
    [imageUrl, sellerId]
  );

  await pool.query(
    `UPDATE users
     SET seller_preferences = jsonb_set(
       COALESCE(seller_preferences, '{}'::jsonb),
       '{shopLogoUrl}',
       to_jsonb($1::text),
       true
     )
     WHERE id = $2`,
    [imageUrl, sellerId]
  );
}

async function ensureSellerAvatarIfNeeded({
  pool,
  sellerId,
  shopName,
  currentLogoUrl,
  uploadDir,
  buildImageUrl,
  req,
}) {
  if (!shouldAutoGenerateSellerAvatar(currentLogoUrl, { shopName, shopNameChanged: false })) {
    return String(currentLogoUrl || "").trim();
  }

  const imageUrl = await createSellerAvatarLogoUrl({
    shopName,
    sellerId,
    currentLogoUrl,
    uploadDir,
    buildImageUrl,
    req,
  });
  await persistSellerLogoUrl(pool, sellerId, imageUrl);
  return imageUrl;
}

module.exports = {
  createSellerAvatarLogoUrl,
  ensureSellerAvatarIfNeeded,
  generateSellerAvatarFile,
  getShopInitial,
  isCustomSellerAvatarReference,
  isGeneratedSellerAvatarReference,
  persistSellerLogoUrl,
  resolveSellerLogoUrlForSave,
  shouldAutoGenerateSellerAvatar,
};
