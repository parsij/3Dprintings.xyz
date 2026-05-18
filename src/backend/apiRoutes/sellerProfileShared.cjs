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

async function ensureSellerProfilesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_profiles (
      seller_user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      shop_name VARCHAR(30) NOT NULL,
      shop_bio VARCHAR(500),
      shop_logo_url TEXT,
      primary_printer_specialization VARCHAR(10) NOT NULL,
      design_software TEXT[] NOT NULL DEFAULT '{}',
      external_portfolio_link TEXT,
      intellectual_property_certified BOOLEAN NOT NULL DEFAULT FALSE,
      terms_of_service_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT seller_profiles_shop_name_length_check CHECK (char_length(shop_name) BETWEEN 3 AND 30),
      CONSTRAINT seller_profiles_shop_name_format_check CHECK (shop_name ~ '^[A-Za-z0-9_ ]+$'),
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
  };
}

function sellerProfileFromRow(row, fallbackPreferences = {}) {
  if (!row?.seller_user_id) {
    return {
      shopName: fallbackPreferences.storeName || "",
      shopBio: fallbackPreferences.storeDescription || "",
      shopLogoUrl: "",
      primaryPrinterSpecialization: "",
      designSoftware: [],
      externalPortfolioLink: "",
      intellectualPropertyCertified: false,
      termsOfServiceAccepted: false,
    };
  }

  return {
    shopName: row.shop_name || "",
    shopBio: row.shop_bio || "",
    shopLogoUrl: row.shop_logo_url || "",
    primaryPrinterSpecialization: row.primary_printer_specialization || "",
    designSoftware: Array.isArray(row.design_software) ? row.design_software : [],
    externalPortfolioLink: row.external_portfolio_link || "",
    intellectualPropertyCertified: Boolean(row.intellectual_property_certified),
    termsOfServiceAccepted: Boolean(row.terms_of_service_accepted),
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

function validateSellerProfile(profile) {
  if (profile.shopName.length < 3 || profile.shopName.length > 30) {
    return "Shop name must be between 3 and 30 characters.";
  }
  if (!/^[A-Za-z0-9_ ]+$/.test(profile.shopName)) {
    return "Shop name can only contain letters, numbers, spaces, and underscores.";
  }
  if (profile.shopBio.length > 500) {
    return "Shop bio must be 500 characters or less.";
  }
  if (profile.shopLogoUrl && !/\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(profile.shopLogoUrl)) {
    return "Shop logo must be a PNG, JPG, JPEG, or WEBP image.";
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

  return "";
}

module.exports = {
  DESIGN_SOFTWARE_OPTIONS: [...DESIGN_SOFTWARE_OPTIONS],
  PRINTER_SPECIALIZATIONS: [...PRINTER_SPECIALIZATIONS],
  ensureSellerProfilesTable,
  normalizeSellerProfile,
  sellerProfileFromRow,
  validateSellerProfile,
};
