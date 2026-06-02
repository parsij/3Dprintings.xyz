const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 40;
const MAX_VARIATIONS = 8;
const MAX_OPTIONS_PER_VARIATION = 9;
const MAX_OPTION_PRICE = 100000;
const COLOR_OPTIONS = new Set([
  "Black",
  "White",
  "Gray",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Orange",
  "Purple",
  "Pink",
  "Brown",
  "Beige",
  "Gold",
  "Silver",
  "Multicolor",
  "Other",
]);
const TAG_PATTERN = /^[a-z0-9][a-z0-9 +#&'()./-]*$/i;

function parseJsonField(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function sanitizeVariationOption(option, index) {
  if (!option || typeof option !== "object") {
    return null;
  }

  const label = String(option.label || option.name || "").trim();
  if (!label || label.length > 80) {
    return null;
  }

  const rawPrice = option.price;
  const parsedPrice = rawPrice === "" || rawPrice == null ? null : Number(rawPrice);

  return {
    id: String(option.id || `option-${index + 1}`),
    label,
    price: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : null,
    visible: option.visible !== false,
  };
}

function sanitizeVariations(rawVariations) {
  const parsed = Array.isArray(rawVariations)
    ? rawVariations
    : parseJsonField(rawVariations, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .slice(0, MAX_VARIATIONS)
    .map((variation, variationIndex) => {
      if (!variation || typeof variation !== "object") {
        return null;
      }

      const name = String(variation.name || variation.label || "").trim();
      if (!name || name.length > 80) {
        return null;
      }

      const options = Array.isArray(variation.options)
        ? variation.options
          .map((option, optionIndex) => sanitizeVariationOption(option, optionIndex))
          .filter(Boolean)
          .slice(0, MAX_OPTIONS_PER_VARIATION)
        : [];

      if (options.length === 0) {
        return null;
      }

      return {
        id: String(variation.id || `variation-${variationIndex + 1}`),
        name,
        presetKey: String(variation.presetKey || variation.preset_key || "custom").slice(0, 32),
        options,
      };
    })
    .filter(Boolean);
}

function inspectRawVariations(rawVariations) {
  if (rawVariations == null || rawVariations === "") {
    return {
      invalid: false,
      parsed: [],
      count: 0,
      hasInvalidData: false,
    };
  }

  const parsed = parseJsonField(rawVariations, null);
  if (!Array.isArray(parsed)) {
    return {
      invalid: true,
      parsed: [],
      count: 0,
      hasInvalidData: true,
    };
  }

  const hasInvalidData = parsed.some((variation) => {
    if (!variation || typeof variation !== "object") return true;

    const name = String(variation.name || variation.label || "").trim();
    if (!name || name.length > 80) return true;

    if (!Array.isArray(variation.options)
      || variation.options.length === 0
      || variation.options.length > MAX_OPTIONS_PER_VARIATION) {
      return true;
    }

    return variation.options.some((option) => {
      if (!option || typeof option !== "object") return true;

      const label = String(option.label || option.name || "").trim();
      if (!label || label.length > 80) return true;

      const rawPrice = option.price;
      const parsedPrice = rawPrice === "" || rawPrice == null ? null : Number(rawPrice);
      return parsedPrice !== null
        && (!Number.isFinite(parsedPrice) || parsedPrice < 0 || parsedPrice > MAX_OPTION_PRICE);
    });
  });

  return {
    invalid: false,
    parsed,
    count: parsed.length,
    hasInvalidData,
  };
}

function parseListingExtras(body = {}) {
  const rawVariations = inspectRawVariations(body.variations);

  return {
    primaryColor: String(body.primaryColor || body.primary_color || "").trim(),
    secondaryColor: String(body.secondaryColor || body.secondary_color || "").trim(),
    shippingProfileId: body.shippingProfileId ?? body.shipping_profile_id ?? null,
    variations: sanitizeVariations(rawVariations.parsed),
    variationsInvalid: rawVariations.invalid,
    variationsRawCount: rawVariations.count,
    variationsHasInvalidData: rawVariations.hasInvalidData,
    videoCount: Number(body.videoCount || 0),
  };
}

function validateListingExtras(extras, { itemType = "physical" } = {}) {
  const fieldErrors = {};

  if (extras.primaryColor && extras.primaryColor.length > 64) {
    fieldErrors.primaryColor = "Primary color value is too long.";
  } else if (extras.primaryColor && !COLOR_OPTIONS.has(extras.primaryColor)) {
    fieldErrors.primaryColor = "Select a valid primary color.";
  }

  if (extras.secondaryColor && extras.secondaryColor.length > 64) {
    fieldErrors.secondaryColor = "Secondary color value is too long.";
  } else if (extras.secondaryColor && !COLOR_OPTIONS.has(extras.secondaryColor)) {
    fieldErrors.secondaryColor = "Select a valid secondary color.";
  }

  if (itemType === "physical" && extras.shippingProfileId != null) {
    const profileId = Number(extras.shippingProfileId);
    if (!Number.isInteger(profileId) || profileId <= 0) {
      fieldErrors.shippingProfileId = "Select a valid shipping profile.";
    }
  }

  if (extras.variationsInvalid || extras.variationsHasInvalidData) {
    fieldErrors.variations = "Variations contain invalid data.";
  } else if (extras.variationsRawCount > MAX_VARIATIONS || extras.variations.length > MAX_VARIATIONS) {
    fieldErrors.variations = `You can add up to ${MAX_VARIATIONS} variations.`;
  }

  return fieldErrors;
}

function validateListingTitle(modelName) {
  const trimmed = String(modelName || "").trim();
  if (trimmed.length < 1) {
    return "Title must be at least 1 character.";
  }
  if (trimmed.length > 120) {
    return "Title must be at most 120 characters.";
  }
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
    return "Title can only contain letters, numbers, and spaces.";
  }
  return "";
}

function validateTagCount(tags) {
  if (Array.isArray(tags) && tags.length > MAX_TAGS) {
    return `You can add up to ${MAX_TAGS} tags.`;
  }
  return "";
}

function validateTags(tags) {
  const countError = validateTagCount(tags);
  if (countError) return countError;

  if (!Array.isArray(tags)) {
    return "Tags must be a list.";
  }

  const invalidTag = tags.find((tag) => {
    const normalized = String(tag || "").trim();
    return !normalized
      || normalized.length > MAX_TAG_LENGTH
      || !TAG_PATTERN.test(normalized);
  });

  if (invalidTag) {
    return `Tags must be ${MAX_TAG_LENGTH} characters or less and use letters, numbers, spaces, or simple punctuation.`;
  }

  return "";
}

module.exports = {
  COLOR_OPTIONS,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_VARIATIONS,
  MAX_OPTIONS_PER_VARIATION,
  MAX_OPTION_PRICE,
  parseListingExtras,
  parseJsonField,
  sanitizeVariations,
  validateListingExtras,
  validateListingTitle,
  validateTagCount,
  validateTags,
};
