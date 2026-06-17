const PRINTER_SPECIALIZATIONS = new Set(["fdm", "sla", "both"]);
const DESIGN_SOFTWARE_OPTIONS = new Set([
  "Blender",
  "Fusion360",
  "ZBrush",
  "SolidWorks",
  "Onshape",
  "Other",
]);
const PORTFOLIO_HOSTS = [
  "printables.com",
  "thangs.com",
  "cults3d.com",
  "thingiverse.com",
  "instagram.com",
];
const DESIGN_SOFTWARE_ALIASES = {
  Fusion: "Fusion360",
};
const DEFAULT_IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || "https://3dprintings.xyz/api/imgUploads";
const DEFAULT_SITE_ORIGIN = process.env.SITE_ORIGIN || "https://3dprintings.xyz";
const { normalizeAddressPayload, validateUsAddress } = require("./shippingShared.cjs");
const { validateShopName } = require("./shopNameShared.cjs");

function hasAllowedImageExtension(value) {
  return /\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(String(value || ""));
}

function resolveShopLogoUrl(rawUrl, options = {}) {
  const imageBaseUrl = options.imageBaseUrl || DEFAULT_IMAGE_BASE_URL;
  const siteOrigin = options.siteOrigin || DEFAULT_SITE_ORIGIN;
  const url = String(rawUrl || "").trim();
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${siteOrigin}${url}`;
  if (/\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(url)) {
    return `${imageBaseUrl}/${url.replace(/^\/+/, "")}`;
  }

  return url;
}

function resolveShopLogoFromSources(profileLogoUrl, preferencesLogoUrl, options = {}) {
  const rawUrl = String(profileLogoUrl || preferencesLogoUrl || "").trim();
  return resolveShopLogoUrl(rawUrl, options);
}

async function ensureSellerProfilesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_profiles (
      seller_user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      shop_name VARCHAR(20) NOT NULL,
      shop_bio VARCHAR(500),
      shop_logo_url TEXT,
      primary_printer_specialization VARCHAR(10) NOT NULL,
      design_software TEXT[] NOT NULL DEFAULT '{}',
      external_portfolio_link TEXT,
      intellectual_property_certified BOOLEAN NOT NULL DEFAULT FALSE,
      terms_of_service_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      sellersaddres JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT seller_profiles_shop_name_length_check CHECK (char_length(shop_name) BETWEEN 3 AND 20),
      CONSTRAINT seller_profiles_shop_name_format_check CHECK (shop_name ~ '^[A-Za-z0-9]+$'),
      CONSTRAINT seller_profiles_printer_check CHECK (primary_printer_specialization IN ('fdm', 'sla', 'both')),
      CONSTRAINT seller_profiles_design_software_check CHECK (design_software <@ ARRAY['Blender', 'Fusion360', 'ZBrush', 'SolidWorks', 'Onshape', 'Other']::TEXT[]),
      CONSTRAINT seller_profiles_shop_logo_type_check CHECK (
        shop_logo_url IS NULL OR lower(shop_logo_url) ~ '\\.(png|jpg|jpeg|webp)(\\?.*)?$'
      )
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS seller_profiles_shop_name_unique_idx
    ON seller_profiles (lower(shop_name))
  `);

  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS sellersaddres JSONB NOT NULL DEFAULT '{}'::jsonb
  `);

  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS completions VARCHAR(32) NOT NULL DEFAULT 'shop_url'
  `);

  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT
  `);

  await pool.query(`
    ALTER TABLE seller_profiles
    ALTER COLUMN shop_name TYPE VARCHAR(20)
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE seller_profiles
    DROP CONSTRAINT IF EXISTS seller_profiles_shop_name_length_check
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE seller_profiles
    DROP CONSTRAINT IF EXISTS seller_profiles_shop_name_format_check
  `).catch(() => {});

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'seller_profiles_shop_name_length_check'
      ) THEN
        ALTER TABLE seller_profiles
        ADD CONSTRAINT seller_profiles_shop_name_length_check
        CHECK (char_length(shop_name) BETWEEN 3 AND 20);
      END IF;
    END $$;
  `).catch(() => {});

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'seller_profiles_shop_name_format_check'
      ) THEN
        ALTER TABLE seller_profiles
        ADD CONSTRAINT seller_profiles_shop_name_format_check
        CHECK (shop_name ~ '^[A-Za-z0-9]+$');
      END IF;
    END $$;
  `).catch(() => {});
}

function normalizeSellerProfile(input = {}) {
  const payload = input && typeof input === "object" ? input : {};
  const designSoftware = Array.isArray(payload.designSoftware)
    ? [
        ...new Set(
          payload.designSoftware
            .map((item) => DESIGN_SOFTWARE_ALIASES[String(item || "").trim()] || String(item || "").trim())
            .filter(Boolean)
        ),
      ]
    : [];

  return {
    shopName: String(payload.shopName || "").trim(),
    shopBio: String(payload.shopBio || "").trim(),
    shopLogoUrl: String(payload.shopLogoUrl || "").trim(),
    primaryPrinterSpecialization: String(payload.primaryPrinterSpecialization || "").trim().toLowerCase(),
    designSoftware,
    externalPortfolioLink: String(payload.externalPortfolioLink || "").trim(),
    intellectualPropertyCertified: Boolean(payload.intellectualPropertyCertified),
    termsOfServiceAccepted: Boolean(payload.termsOfServiceAccepted),
    sellerAddress: normalizeAddressPayload(payload.sellerAddress || payload.sellersaddres || {}),
  };
}

function sellerProfileFromRow(row, fallbackPreferences = {}) {
  if (!row?.seller_user_id) {
    return {
      shopName: fallbackPreferences.storeName || "",
      shopBio: fallbackPreferences.storeDescription || "",
      shopLogoUrl: resolveShopLogoFromSources("", fallbackPreferences.shopLogoUrl),
      primaryPrinterSpecialization: "",
      designSoftware: [],
    externalPortfolioLink: "",
    intellectualPropertyCertified: false,
    termsOfServiceAccepted: false,
    sellerAddress: {},
  };
  }

  return {
    shopName: row.shop_name || "",
    shopBio: row.shop_bio || "",
    shopLogoUrl: resolveShopLogoFromSources(row.shop_logo_url, fallbackPreferences.shopLogoUrl),
    primaryPrinterSpecialization: row.primary_printer_specialization || "",
    designSoftware: Array.isArray(row.design_software) ? row.design_software : [],
    externalPortfolioLink: row.external_portfolio_link || "",
    intellectualPropertyCertified: Boolean(row.intellectual_property_certified),
    termsOfServiceAccepted: Boolean(row.terms_of_service_accepted),
    sellerAddress: normalizeAddressPayload(row.sellersaddres || {}),
  };
}

function isAllowedPortfolioUrl(rawUrl) {
  if (!rawUrl) return true;

  try {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return PORTFOLIO_HOSTS.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
  } catch {
    return false;
  }
}

function isAllowedShopLogoUrl(rawUrl, options = {}) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return true;
  if (!hasAllowedImageExtension(raw)) return false;

  const imageBaseUrl = String(options.imageBaseUrl || DEFAULT_IMAGE_BASE_URL).replace(/\/+$/, "");
  const siteOrigin = String(options.siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, "");

  if (/^[A-Za-z0-9._-]+$/.test(raw)) return true;
  if (raw.startsWith("/api/imgUploads/") || raw.startsWith("/imgUploads/")) return true;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return false;

    const allowedBases = [imageBaseUrl, siteOrigin]
      .filter(Boolean)
      .map((base) => new URL(base));

    return allowedBases.some((base) => {
      const basePath = base.pathname.replace(/\/+$/, "");
      return parsed.origin === base.origin
        && (!basePath || parsed.pathname === basePath || parsed.pathname.startsWith(`${basePath}/`));
    });
  } catch {
    return false;
  }
}

function validateSellerProfile(profile) {
  const shopNameError = validateShopName(profile.shopName);
  if (shopNameError) {
    return shopNameError;
  }
  if (profile.shopBio.length > 500) {
    return "Shop bio must be 500 characters or less.";
  }
  if (!isAllowedShopLogoUrl(profile.shopLogoUrl)) {
    return "Shop logo must be an uploaded PNG, JPG, JPEG, or WEBP image.";
  }
  if (!PRINTER_SPECIALIZATIONS.has(profile.primaryPrinterSpecialization)) {
    return "Select a primary printer specialization.";
  }
  if (profile.designSoftware.some((item) => !DESIGN_SOFTWARE_OPTIONS.has(item))) {
    return "Design software contains an unsupported option.";
  }
  if (!isAllowedPortfolioUrl(profile.externalPortfolioLink)) {
    return "Portfolio link must be a valid Printables, Thangs, Cults3D, Thingiverse, or Instagram URL.";
  }
  if (!profile.intellectualPropertyCertified) {
    return "You must certify that you own or have commercial rights to your uploaded files.";
  }
  if (!profile.termsOfServiceAccepted) {
    return "You must accept the creator terms of service.";
  }
  const hasSellerAddress = ["line1", "city", "state", "zip"].some((key) => String(profile.sellerAddress?.[key] || "").trim());
  if (hasSellerAddress) {
    const sellerAddressError = validateUsAddress(profile.sellerAddress, "Seller fulfillment address", {
      requireStreetNumber: true,
    });
    if (sellerAddressError) return sellerAddressError;
  }

  return "";
}

module.exports = {
  DESIGN_SOFTWARE_OPTIONS: [...DESIGN_SOFTWARE_OPTIONS],
  PRINTER_SPECIALIZATIONS: [...PRINTER_SPECIALIZATIONS],
  DEFAULT_IMAGE_BASE_URL,
  DEFAULT_SITE_ORIGIN,
  ensureSellerProfilesTable,
  normalizeSellerProfile,
  isAllowedShopLogoUrl,
  resolveShopLogoFromSources,
  resolveShopLogoUrl,
  sellerProfileFromRow,
  validateSellerProfile,
};
