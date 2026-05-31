import { getUserFacingError } from "./userFacingError.js";

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

const ONBOARDING_MESSAGES = {
  shop_url: "Finish setting up your shop URL before listing products.",
  stripe_connect: "Connect your Stripe account before listing products.",
  shipping_origin: "Add your shipping origin address before listing products.",
};

function isUserSafeFieldMessage(message) {
  return typeof message === "string"
    && message.trim().length > 0
    && message.trim().length <= 280
    && !message.includes("\n")
    && !message.includes("\r");
}

function normalizeResponseData(rawData) {
  if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
    return rawData;
  }

  if (typeof rawData === "string" && rawData.trim()) {
    return { message: rawData.trim().slice(0, 280) };
  }

  return {};
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
    if (entry.field === "general") {
      return entry.message;
    }
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
  constructor(message, { fieldErrors = {}, boxesUrl = null, completionStep = null } = {}) {
    super(message);
    this.name = "ApiValidationError";
    this.fieldErrors = normalizeApiFieldErrors(fieldErrors);
    this.boxesUrl = boxesUrl ?? null;
    this.completionStep = completionStep ?? null;
  }
}

export function createApiValidationError(data, fallbackMessage) {
  const fieldErrors = normalizeApiFieldErrors(data?.errors);
  const message = Object.keys(fieldErrors).length > 0
    ? formatListingValidationSummary(fieldErrors)
    : fallbackMessage;

  return new ApiValidationError(message, {
    fieldErrors,
    boxesUrl: data?.boxesUrl ?? null,
    completionStep: data?.completionStep ?? null,
  });
}

function buildFieldErrorsFromResponse(data, status) {
  const fieldErrors = normalizeApiFieldErrors(data?.errors);
  const responseMessage = getUserFacingError(
    { response: { data } },
    ""
  );

  if (!fieldErrors.general && responseMessage) {
    fieldErrors.general = responseMessage;
  }

  if (!fieldErrors.general && typeof data?.message === "string" && isUserSafeFieldMessage(data.message)) {
    fieldErrors.general = data.message.trim();
  }

  if (!fieldErrors.general && status === 401) {
    fieldErrors.general = "Please sign in again to submit a listing.";
  }

  if (!fieldErrors.general && status === 403 && data?.completionStep) {
    fieldErrors.general = ONBOARDING_MESSAGES[data.completionStep]
      || data.message
      || "Complete seller onboarding before listing products.";
  }

  if (!fieldErrors.general && status === 403) {
    fieldErrors.general = responseMessage || "You do not have permission to submit this listing.";
  }

  if (!fieldErrors.general && status === 413) {
    fieldErrors.general = "We could not upload one of your photos. Try again with fewer photos.";
  }

  if (!fieldErrors.general && status >= 500) {
    fieldErrors.general = responseMessage
      || "We could not save your listing right now. Please try again in a few minutes.";
  }

  return fieldErrors;
}

export function parseListingSubmitError(error, fallbackMessage) {
  const response = error?.response;
  const status = response?.status;
  const data = normalizeResponseData(response?.data);
  const fieldErrors = buildFieldErrorsFromResponse(data, status);

  if (!response) {
    const networkMessage = error?.code === "ERR_NETWORK"
      ? "Unable to reach the server. Make sure the backend is running, then try again."
      : "Unable to submit your listing right now. Check your connection and try again.";

    return new ApiValidationError(networkMessage, {
      fieldErrors: { general: networkMessage },
    });
  }

  if (data?.boxesUrl) {
    const message = fieldErrors.general
      || getUserFacingError({ response: { data } }, "You need to configure shipping boxes before listing products.");

    return new ApiValidationError(message, {
      fieldErrors: { ...fieldErrors, general: message },
      boxesUrl: data.boxesUrl,
      completionStep: data.completionStep ?? null,
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return new ApiValidationError(
      formatListingValidationSummary(fieldErrors) || fieldErrors.general || fallbackMessage,
      {
        fieldErrors,
        completionStep: data?.completionStep ?? null,
      }
    );
  }

  return new ApiValidationError(fallbackMessage, {
    fieldErrors: { general: fallbackMessage },
  });
}
