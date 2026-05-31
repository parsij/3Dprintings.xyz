const LISTING_FIELD_LABELS = {
  photos: "Photos",
  modelName: "Model name",
  description: "Description",
  price: "Price",
  category: "Category",
  quantity: "Quantity",
  tags: "Tags",
  modelWeight: "Model weight",
  modelHeight: "Height",
  modelWidth: "Width",
  modelLength: "Length",
  daysToPrepare: "Days to prepare",
  general: "Form",
  dimensions: "Model specs",
};

const LISTING_FIELD_ORDER = [
  "photos",
  "modelName",
  "price",
  "quantity",
  "category",
  "description",
  "modelWeight",
  "modelHeight",
  "modelWidth",
  "modelLength",
  "daysToPrepare",
  "tags",
  "general",
  "dimensions",
];

const LISTING_FIELD_IDS = {
  photos: "modelPhotos",
  modelName: "modelName",
  price: "price",
  quantity: "quantity",
  category: "category",
  description: "description",
  modelWeight: "modelWeight",
  modelHeight: "modelHeight",
  modelWidth: "modelWidth",
  modelLength: "modelLength",
  daysToPrepare: "daysToPrepare",
  general: "listing-general-error",
  dimensions: "modelWeight",
};

function isUserSafeFieldMessage(message) {
  return typeof message === "string"
    && message.trim().length > 0
    && message.trim().length <= 280
    && !message.includes("\n")
    && !message.includes("\r");
}

export function normalizeApiFieldErrors(rawErrors) {
  if (!rawErrors || typeof rawErrors !== "object" || Array.isArray(rawErrors)) {
    return {};
  }

  const normalized = {};

  for (const [field, message] of Object.entries(rawErrors)) {
    if (!isUserSafeFieldMessage(message)) {
      continue;
    }
    normalized[field] = message.trim();
  }

  return normalized;
}

export function getFirstListingFieldError(fieldErrors) {
  return LISTING_FIELD_ORDER.find((field) => fieldErrors[field]) ?? null;
}

export function getListingFieldElementId(field) {
  return LISTING_FIELD_IDS[field] || field;
}

export function formatListingValidationSummary(fieldErrors) {
  const entries = LISTING_FIELD_ORDER
    .filter((field) => fieldErrors[field])
    .map((field) => ({
      field,
      label: LISTING_FIELD_LABELS[field] || field,
      message: fieldErrors[field],
    }));

  if (entries.length === 0) {
    return "";
  }

  if (entries.length === 1) {
    const [entry] = entries;
    return `${entry.label}: ${entry.message}`;
  }

  return `Please fix the highlighted fields below (${entries.map((entry) => entry.label).join(", ")}).`;
}

export function scrollToListingField(field) {
  if (!field || typeof document === "undefined") {
    return;
  }

  const elementId = getListingFieldElementId(field);
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "center" });

  if (typeof element.focus === "function") {
    element.focus({ preventScroll: true });
  }
}

export class ApiValidationError extends Error {
  constructor(message, { fieldErrors = {}, boxesUrl = null } = {}) {
    super(message);
    this.name = "ApiValidationError";
    this.fieldErrors = normalizeApiFieldErrors(fieldErrors);
    this.boxesUrl = boxesUrl ?? null;
  }
}

export function createApiValidationError(data, fallbackMessage) {
  const fieldErrors = normalizeApiFieldErrors(data?.errors);
  const message = Object.keys(fieldErrors).length > 0
    ? formatListingValidationSummary(fieldErrors)
    : fallbackMessage;

  const error = new ApiValidationError(message, {
    fieldErrors,
    boxesUrl: data?.boxesUrl ?? null,
  });

  return error;
}
