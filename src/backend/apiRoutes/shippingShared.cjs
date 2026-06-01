const EasyPostClient = require("@easypost/api");
const { createUserError, logInternalError } = require("../apiErrorShared.cjs");
const { listSellerBoxes } = require("./sellerBoxesShared.cjs");
const {
  packItemsIntoSmallestSellerBox,
  resolvePrepareDays,
} = require("./sellerBoxPackingShared.cjs");

const SHIPPING_MARKUP_RATE = 0.165;
const SHIPPING_TIERS = new Set(["economy", "standard", "express"]);
const SHIPPING_TIER_ORDER = ["economy", "standard", "express"];
const DEFAULT_SHIPPING_TIER = "economy";
const DEFAULT_PARCEL = {
  length: Number(process.env.EASYPOST_DEFAULT_PARCEL_LENGTH_IN || 8),
  width: Number(process.env.EASYPOST_DEFAULT_PARCEL_WIDTH_IN || 6),
  height: Number(process.env.EASYPOST_DEFAULT_PARCEL_HEIGHT_IN || 4),
  weight: Number(process.env.EASYPOST_DEFAULT_PARCEL_WEIGHT_OZ || 16),
};
const US_STATE_CODE_REGEX = /^[A-Z]{2}$/;
const US_POSTAL_CODE_REGEX = /^\d{5}(?:-\d{4})?$/;
const TEST_TRACKING_TIMELINE_MS = 3 * 60 * 1000;
const scheduledTestTrackingOrders = new Set();
const TEST_TRACKING_STEPS = [
  {
    delayRatio: 0,
    status: "pending_shipping",
    statusDetail: "order_preparing",
    message: "Pending shipping",
    location: null,
  },
  {
    delayRatio: 0.18,
    status: "pre_transit",
    statusDetail: "label_created",
    message: "Shipping label created",
    location: { city: "San Francisco", state: "CA", country: "US", zip: "94104" },
  },
  {
    delayRatio: 0.36,
    status: "in_transit",
    statusDetail: "accepted_at_origin_facility",
    message: "Package accepted at origin facility",
    location: { city: "San Francisco", state: "CA", country: "US", zip: "94104" },
  },
  {
    delayRatio: 0.54,
    status: "in_transit",
    statusDetail: "departed_distribution_center",
    message: "Departed distribution center",
    location: { city: "Oakland", state: "CA", country: "US", zip: "94621" },
  },
  {
    delayRatio: 0.72,
    status: "in_transit",
    statusDetail: "arrived_at_regional_facility",
    message: "Arrived at regional distribution center",
    location: { city: "Los Angeles", state: "CA", country: "US", zip: "90040" },
  },
  {
    delayRatio: 0.88,
    status: "out_for_delivery",
    statusDetail: "out_for_delivery",
    message: "Out for delivery",
    location: { city: "Los Angeles", state: "CA", country: "US", zip: "90012" },
  },
  {
    delayRatio: 1,
    status: "delivered",
    statusDetail: "delivered",
    message: "Delivered",
    location: { city: "Los Angeles", state: "CA", country: "US", zip: "90012" },
  },
];

function centsFromDollars(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function dollarsFromCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric / 100;
}

function normalizeText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeState(value) {
  return normalizeText(value).toUpperCase();
}

function normalizeCountry(value) {
  return normalizeText(value || "US").toUpperCase();
}

function normalizeAddressPayload(address = {}) {
  const payload = address && typeof address === "object" ? address : {};
  return {
    line1: normalizeText(payload.line1 || payload.street1 || payload.street || payload.street_address),
    line2: normalizeText(payload.line2 || payload.street2),
    city: normalizeText(payload.city),
    state: normalizeState(payload.state || payload.state_province),
    zip: normalizeText(payload.zip || payload.postalCode || payload.postal_code),
    country: normalizeCountry(payload.country || payload.country_code),
    name: normalizeText(payload.name),
    company: normalizeText(payload.company),
    phone: normalizeText(payload.phone),
    email: normalizeText(payload.email),
    residential: payload.residential === undefined ? true : Boolean(payload.residential),
  };
}

function hasAddressValue(address = {}) {
  return ["line1", "city", "state", "zip", "country", "name", "phone", "email"].some((key) => {
    return normalizeText(address[key]).length > 0;
  });
}

function validateUsAddress(address, label = "address", { requireStreetNumber = false } = {}) {
  if (!address?.line1 || !address?.city || !address?.state || !address?.zip || !address?.country) {
    return `Missing ${label}.`;
  }
  if (address.country !== "US") {
    return `${label} must be in the United States.`;
  }
  if (!US_STATE_CODE_REGEX.test(address.state)) {
    return `${label} state must be a 2-letter US code.`;
  }
  if (!US_POSTAL_CODE_REGEX.test(address.zip)) {
    return `${label} ZIP code must be valid.`;
  }
  if (requireStreetNumber && !/\d/.test(address.line1)) {
    return `${label} street address must include a building number.`;
  }
  return "";
}

function buildEasyPostAddress(address, fallback = {}) {
  const normalized = normalizeAddressPayload(address);
  const fallbackPayload = fallback && typeof fallback === "object" ? fallback : {};
  return {
    name: normalized.name || normalizeText(fallbackPayload.name) || "3D Printings Customer",
    company: normalized.company || undefined,
    street1: normalized.line1,
    street2: normalized.line2 || undefined,
    city: normalized.city,
    state: normalized.state,
    zip: normalized.zip,
    country: normalized.country || "US",
    phone: normalized.phone || normalizeText(fallbackPayload.phone) || "0000000000",
    email: normalized.email || normalizeText(fallbackPayload.email) || "support@3dprintings.xyz",
    residential: normalized.residential,
  };
}

function easyPostAddressToNormalized(easyPostAddress) {
  return normalizeAddressPayload({
    line1: easyPostAddress?.street1,
    line2: easyPostAddress?.street2,
    city: easyPostAddress?.city,
    state: easyPostAddress?.state,
    zip: easyPostAddress?.zip,
    country: easyPostAddress?.country,
    name: easyPostAddress?.name,
    company: easyPostAddress?.company,
    phone: easyPostAddress?.phone,
    email: easyPostAddress?.email,
    residential: easyPostAddress?.residential,
  });
}

function preserveDisplayCasing(preferred, normalized) {
  const preferredText = normalizeText(preferred);
  const normalizedText = normalizeText(normalized);
  if (!normalizedText) return preferredText;
  if (!preferredText) return normalizedText;
  if (preferredText.localeCompare(normalizedText, undefined, { sensitivity: "accent" }) === 0) {
    return preferredText;
  }
  return normalizedText;
}

function mergeVerifiedAddressDisplay(userAddress, verifiedAddress) {
  const user = normalizeAddressPayload(userAddress);
  const verified = normalizeAddressPayload(verifiedAddress);
  return {
    ...verified,
    line1: preserveDisplayCasing(user.line1, verified.line1),
    line2: preserveDisplayCasing(user.line2, verified.line2),
    city: preserveDisplayCasing(user.city, verified.city),
  };
}

function isDeliverableVerifiedAddress(verifiedAddress) {
  return verifiedAddress?.verifications?.delivery?.success === true;
}

function getDeliveryVerificationErrors(verifiedAddress) {
  const delivery = verifiedAddress?.verifications?.delivery;
  if (!delivery || delivery.success === true) {
    return [];
  }

  const messages = (delivery.errors || [])
    .map((entry) => String(entry?.message || "").trim())
    .filter(Boolean);

  if (messages.length === 0) {
    messages.push("Address is not deliverable.");
  }

  return [...new Set(messages)];
}

function getEasyPostVerificationErrors(verifiedAddress) {
  const verifications = verifiedAddress?.verifications;
  if (!verifications || typeof verifications !== "object") {
    return [];
  }

  const errors = [];
  for (const key of ["delivery", "zip4"]) {
    const block = verifications[key];
    if (!block || block.success === true) continue;
    for (const entry of block.errors || []) {
      if (entry && typeof entry === "object") {
        errors.push(entry);
      }
    }
  }

  return errors;
}

function isEasyPostNotFoundOnly(verifiedAddress) {
  const errors = getEasyPostVerificationErrors(verifiedAddress);
  if (errors.length === 0) {
    return false;
  }

  return errors.every((entry) => String(entry?.code || "").trim() === "E.ADDRESS.NOT_FOUND");
}

function snapshotAddressForDebug(address) {
  if (!address || typeof address !== "object") return address;
  return {
    line1: address.line1 || address.street1 || null,
    line2: address.line2 || address.street2 || null,
    city: address.city || null,
    state: address.state || null,
    zip: address.zip || null,
    country: address.country || null,
    residential: address.residential ?? null,
    name: address.name || null,
  };
}

function snapshotEasyPostAddressResponse(address) {
  if (!address || typeof address !== "object") return address;
  return {
    id: address.id || null,
    street1: address.street1 || null,
    street2: address.street2 || null,
    city: address.city || null,
    state: address.state || null,
    zip: address.zip || null,
    country: address.country || null,
    residential: address.residential ?? null,
    verifications: address.verifications || null,
  };
}

function snapshotEasyPostErrorForDebug(error) {
  if (!error || typeof error !== "object") {
    return { message: String(error || "") };
  }

  return {
    message: error.message || null,
    statusCode: error.statusCode || error.status || null,
    code: error.code || null,
    errors: error.errors || null,
    body: error.body || null,
  };
}

function logAddressVerificationDebug(phase, payload = {}) {
  console.error(
    `[address-verify-debug] ${phase}`,
    JSON.stringify(payload, null, 2)
  );
}

function buildAddressVerificationUserMessage(verifiedAddress) {
  const deliveryErrors = getDeliveryVerificationErrors(verifiedAddress);
  const errorCodes = (verifiedAddress?.verifications?.delivery?.errors || [])
    .map((entry) => String(entry?.code || "").trim())
    .filter(Boolean);

  if (
    errorCodes.includes("E.ADDRESS.NOT_FOUND")
    || deliveryErrors.some((message) => /not found/i.test(message))
  ) {
    return "We could not verify that address with the postal service. Please double-check the street, city, state, and ZIP code.";
  }

  return "We could not verify that address. Please double-check the street, city, state, and ZIP code.";
}

function shouldLogAddressVerificationVerbose() {
  const flag = String(process.env.DEBUG_ADDRESS_VERIFY || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

async function verifyAddressWithEasyPost(address, fallback = {}, label = "address", options = {}) {
  const normalized = normalizeAddressPayload(address);
  const verbose = shouldLogAddressVerificationVerbose();
  const allowNotFoundSoftPass = options?.allowNotFoundSoftPass !== false;

  if (verbose) {
    logAddressVerificationDebug("request.input", {
      label,
      fallback: snapshotAddressForDebug(fallback),
      normalized: snapshotAddressForDebug(normalized),
    });
  }

  let client;
  try {
    client = getEasyPostClient();
  } catch (error) {
    logAddressVerificationDebug("easypost.client-unavailable", {
      label,
      normalized: snapshotAddressForDebug(normalized),
      error: snapshotEasyPostErrorForDebug(error),
    });
    logInternalError("easypost-client-unavailable", error);
    return normalized;
  }

  const payload = {
    ...buildEasyPostAddress(normalized, fallback),
    verify: true,
  };

  if (verbose) {
    logAddressVerificationDebug("request.easypost-payload", {
      label,
      payload: snapshotAddressForDebug({
        line1: payload.street1,
        line2: payload.street2,
        city: payload.city,
        state: payload.state,
        zip: payload.zip,
        country: payload.country,
        residential: payload.residential,
        name: payload.name,
      }),
      verify: payload.verify === true,
    });
  }

  try {
    const verified = await client.Address.create(payload);

    if (verbose) {
      logAddressVerificationDebug("response.easypost-success", {
        label,
        response: snapshotEasyPostAddressResponse(verified),
      });
    }

    if (isDeliverableVerifiedAddress(verified)) {
      return mergeVerifiedAddressDisplay(normalized, easyPostAddressToNormalized(verified));
    }

    if (allowNotFoundSoftPass && isEasyPostNotFoundOnly(verified)) {
      logAddressVerificationDebug("response.easypost-not-found-soft-pass", {
        label,
        request: snapshotAddressForDebug(normalized),
        response: snapshotEasyPostAddressResponse(verified),
        note: "USPS database miss; accepting locally validated address and deferring to rate quote.",
      });
      return normalized;
    }

    const deliveryErrors = getDeliveryVerificationErrors(verified);
    logAddressVerificationDebug("response.easypost-not-deliverable", {
      label,
      request: snapshotAddressForDebug(normalized),
      easypostPayload: snapshotAddressForDebug({
        line1: payload.street1,
        line2: payload.street2,
        city: payload.city,
        state: payload.state,
        zip: payload.zip,
        country: payload.country,
        residential: payload.residential,
        name: payload.name,
      }),
      response: snapshotEasyPostAddressResponse(verified),
      deliveryErrors,
    });
    logInternalError(
      "easypost-address-verify",
      new Error(deliveryErrors.join("; ") || "Address not deliverable")
    );
    throw createUserError(buildAddressVerificationUserMessage(verified));
  } catch (error) {
    if (error?.exposeToClient === true) {
      logAddressVerificationDebug("response.rejected-user-error", {
        label,
        request: snapshotAddressForDebug(normalized),
        clientMessage: error.message,
      });
      throw error;
    }

    const statusCode = Number(error?.statusCode || error?.status);
    logAddressVerificationDebug("response.easypost-error", {
      label,
      request: snapshotAddressForDebug(normalized),
      easypostPayload: snapshotAddressForDebug({
        line1: payload.street1,
        line2: payload.street2,
        city: payload.city,
        state: payload.state,
        zip: payload.zip,
        country: payload.country,
        residential: payload.residential,
        name: payload.name,
      }),
      error: snapshotEasyPostErrorForDebug(error),
      statusCode: Number.isInteger(statusCode) ? statusCode : null,
    });

    if (!Number.isInteger(statusCode) || statusCode >= 500) {
      logInternalError("easypost-address-verify-unavailable", error);
      return normalized;
    }

    logInternalError("easypost-address-verify", error);
    throw createUserError(
      "We could not verify that address. Please double-check the street, city, state, and ZIP code."
    );
  }
}

async function resolveVerifiedShippingAddress(address, fallback = {}, label = "Shipping address", options = {}) {
  const normalized = normalizeAddressPayload({ ...address, residential: true });
  const validationError = validateUsAddress(normalized, label, { requireStreetNumber: true });
  if (validationError) {
    logAddressVerificationDebug("validation.failed", {
      label,
      request: snapshotAddressForDebug(normalized),
      validationError,
    });
    throw createUserError(validationError);
  }

  if (shouldLogAddressVerificationVerbose()) {
    logAddressVerificationDebug("validation.passed", {
      label,
      request: snapshotAddressForDebug(normalized),
    });
  }

  return verifyAddressWithEasyPost(normalized, fallback, label, options);
}

function getEasyPostClient() {
  const apiKey = normalizeText(process.env.EASYPOST_API_KEY);
  if (!apiKey) {
    const error = new Error("Missing EASYPOST_API_KEY on server.");
    error.statusCode = 500;
    throw error;
  }
  return new EasyPostClient(apiKey, {
    timeout: 15000,
  });
}

async function createEasyPostShipment(shipment) {
  const client = getEasyPostClient();
  try {
    return await client.Shipment.create(shipment);
  } catch (error) {
    logInternalError("easypost-shipment-create", error);
    throw createUserError(
      "Shipping rates are unavailable for this address right now. Please try again or use a different address.",
      502
    );
  }
}

async function createEasyPostTracker({ trackingCode, carrier }) {
  const client = getEasyPostClient();
  const tracker = {
    tracking_code: normalizeText(trackingCode),
  };
  const normalizedCarrier = normalizeText(carrier);
  if (normalizedCarrier) tracker.carrier = normalizedCarrier;
  try {
    return await client.Tracker.create(tracker);
  } catch (error) {
    logInternalError("easypost-tracker-create", error);
    throw createUserError("Tracking is temporarily unavailable. Please try again later.", 502);
  }
}

function normalizeShippingTier(value) {
  const tier = String(value || DEFAULT_SHIPPING_TIER).trim().toLowerCase();
  return SHIPPING_TIERS.has(tier) ? tier : DEFAULT_SHIPPING_TIER;
}

function assertValidShippingTier(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return DEFAULT_SHIPPING_TIER;
  }

  const tier = String(value).trim().toLowerCase();
  if (!SHIPPING_TIERS.has(tier)) {
    const error = new Error("Invalid shipping option selected.");
    error.statusCode = 400;
    throw error;
  }
  return tier;
}

function normalizeRates(rates = []) {
  return rates
    .map((rate) => ({
      ...rate,
      rateCents: centsFromDollars(rate?.rate),
      deliveryDays: Number.isFinite(Number(rate?.delivery_days))
        ? Number(rate.delivery_days)
        : Number.isFinite(Number(rate?.est_delivery_days))
          ? Number(rate.est_delivery_days)
          : null,
    }))
    .filter((rate) => rate.rateCents > 0 && String(rate.currency || "USD").toUpperCase() === "USD")
    .sort((left, right) => left.rateCents - right.rateCents);
}

function pickShippingTierRate(rates = [], tier = DEFAULT_SHIPPING_TIER) {
  const sorted = normalizeRates(rates);
  if (sorted.length === 0) return null;

  if (tier === "economy") {
    return sorted[0];
  }

  if (tier === "standard") {
    const middleIndex = Math.floor((sorted.length - 1) / 2);
    return sorted[middleIndex];
  }

  const withDeliveryDays = sorted.filter((rate) => Number.isFinite(rate.deliveryDays));
  const candidateRates = withDeliveryDays.length > 0 ? withDeliveryDays : sorted;
  const fastestDays = Math.min(...candidateRates.map((rate) => rate.deliveryDays ?? Number.MAX_SAFE_INTEGER));
  const fastestRates = candidateRates.filter((rate) => (rate.deliveryDays ?? Number.MAX_SAFE_INTEGER) === fastestDays);
  return fastestRates.sort((left, right) => left.rateCents - right.rateCents)[0] || sorted[0];
}

const MIN_CARRIER_TRANSIT_DAYS = 1;
const MAX_CARRIER_TRANSIT_DAYS_UNKNOWN = 7;
const MIN_DELIVERY_WINDOW_SPREAD = 1;

function normalizeDeliveryWindowRange(minDays, maxDays) {
  const min = Math.max(1, Math.round(minDays));
  let max = Math.max(1, Math.round(maxDays));
  if (max <= min) {
    max = min + MIN_DELIVERY_WINDOW_SPREAD;
  }
  return { minDays: min, maxDays: max };
}

function computeDeliveryWindowDays(deliveryDays, prepareDays) {
  const prepDays = Math.max(1, Math.min(7, Number(prepareDays) || 1));

  if (deliveryDays === null || deliveryDays === undefined || deliveryDays === "") {
    return normalizeDeliveryWindowRange(
      prepDays + MIN_CARRIER_TRANSIT_DAYS,
      prepDays + MAX_CARRIER_TRANSIT_DAYS_UNKNOWN
    );
  }

  const carrierDays = Number(deliveryDays);
  if (!Number.isFinite(carrierDays) || carrierDays < 0) {
    return normalizeDeliveryWindowRange(
      prepDays + MIN_CARRIER_TRANSIT_DAYS,
      prepDays + MAX_CARRIER_TRANSIT_DAYS_UNKNOWN
    );
  }

  const transitDays = Math.max(MIN_CARRIER_TRANSIT_DAYS, carrierDays);
  return normalizeDeliveryWindowRange(
    prepDays + transitDays,
    prepDays + transitDays + MIN_DELIVERY_WINDOW_SPREAD
  );
}

function buildDeliveryWindowLabel(deliveryDays, prepareDays) {
  const { minDays, maxDays } = computeDeliveryWindowDays(deliveryDays, prepareDays);
  return `${minDays}-${maxDays} business days`;
}

function applyShippingMarkup(originalShippingCents) {
  return Math.ceil(Number(originalShippingCents || 0) * (1 + SHIPPING_MARKUP_RATE));
}

function chooseCheapestRate(rates = []) {
  return pickShippingTierRate(rates, "economy");
}

function buildParcelForItems(items = []) {
  const quantity = items.reduce((sum, item) => {
    const parsed = Number(item?.quantity);
    return sum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
  }, 0);

  return {
    length: DEFAULT_PARCEL.length,
    width: DEFAULT_PARCEL.width,
    height: DEFAULT_PARCEL.height,
    weight: Math.max(DEFAULT_PARCEL.weight, DEFAULT_PARCEL.weight * Math.max(quantity, 1)),
  };
}

function normalizeSellerAddressFromRow(row = {}) {
  const profileAddress = row.sellersaddres && typeof row.sellersaddres === "object" ? row.sellersaddres : {};
  const fallbackUserAddress = {
    line1: row.seller_street_address,
    city: row.seller_city,
    state: row.seller_state_province,
    zip: row.seller_postal_code,
    country: row.seller_country_code,
    name: row.shop_name || row.seller_username,
    email: row.seller_email,
    phone: row.seller_phone_number,
    residential: true,
  };
  const normalizedProfileAddress = normalizeAddressPayload(profileAddress);
  const address = hasAddressValue(normalizedProfileAddress)
    ? normalizedProfileAddress
    : normalizeAddressPayload(fallbackUserAddress);

  return {
    ...address,
    name: address.name || normalizeText(row.shop_name || row.seller_username) || "Seller",
    email: address.email || normalizeText(row.seller_email),
    phone: address.phone || normalizeText(row.seller_phone_number),
  };
}

function groupItemsBySeller(items = []) {
  const groups = new Map();
  for (const item of items) {
    const sellerId = Number(item.sellerId || item.seller_id);
    if (!Number.isFinite(sellerId) || sellerId <= 0) continue;
    if (!groups.has(sellerId)) {
      groups.set(sellerId, {
        sellerId,
        sellerName: item.sellerName || item.shopName || item.creator_name || `Seller ${sellerId}`,
        sellerAddress: item.sellerAddress,
        items: [],
      });
    }
    groups.get(sellerId).items.push(item);
  }
  return [...groups.values()];
}

async function calculateEasyPostShippingQuote({
  pool,
  items,
  toAddress,
  shippingTier = DEFAULT_SHIPPING_TIER,
  verifiedDestination = null,
}) {
  const normalizedTier = normalizeShippingTier(shippingTier);
  const destination = verifiedDestination
    ? normalizeAddressPayload({ ...verifiedDestination, residential: true })
    : await resolveVerifiedShippingAddress(toAddress, { name: "3D Printings Customer" });

  const groups = groupItemsBySeller(items);
  if (groups.length === 0) {
    const error = new Error("No seller shipments to rate.");
    error.statusCode = 400;
    throw error;
  }

  const shipmentQuotes = [];
  for (const group of groups) {
    const sellerAddress = normalizeAddressPayload(group.sellerAddress);
    const sellerAddressError = validateUsAddress(sellerAddress, `${group.sellerName} fulfillment address`, {
      requireStreetNumber: true,
    });
    if (sellerAddressError) {
      throw createUserError(sellerAddressError);
    }

    const sellerBoxes = await listSellerBoxes(pool, group.sellerId);
    if (sellerBoxes.length === 0) {
      const error = new Error(`${group.sellerName} has not configured shipping boxes yet.`);
      error.statusCode = 400;
      throw error;
    }

    const packingResult = await packItemsIntoSmallestSellerBox(group.items, sellerBoxes);
    if (!packingResult.fits) {
      const error = new Error(`No seller box fits the selected items from ${group.sellerName}.`);
      error.statusCode = 400;
      throw error;
    }

    const prepareDays = resolvePrepareDays(group.items);
    const shipment = await createEasyPostShipment({
      to_address: buildEasyPostAddress(destination, {
        name: "3D Printings Customer",
      }),
      from_address: buildEasyPostAddress(sellerAddress, {
        name: group.sellerName,
      }),
      parcel: packingResult.parcel,
    });

    const rates = shipment?.rates || [];
    if (rates.length === 0) {
      const error = new Error(`No EasyPost shipping rates found for ${group.sellerName}.`);
      error.statusCode = 502;
      throw error;
    }

    shipmentQuotes.push({
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      productIds: group.items.map((item) => Number(item.id || item.productId)).filter(Number.isFinite),
      productNames: group.items.map((item) => item.name).filter(Boolean),
      quantity: group.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
      easypostShipmentId: shipment.id || null,
      rates,
      prepareDays,
      selectedBox: {
        id: packingResult.box.id,
        name: packingResult.box.name,
        widthMm: packingResult.box.widthMm,
        lengthMm: packingResult.box.lengthMm,
        heightMm: packingResult.box.heightMm,
        maxWeightG: packingResult.box.maxWeightG,
      },
      parcel: packingResult.parcel,
      totalWeightG: packingResult.totalWeightG,
    });
  }

  const shippingOptions = SHIPPING_TIER_ORDER.map((tier) => {
    let originalShippingCents = 0;
    let minDeliveryDays = null;
    let maxDeliveryDays = null;

    const tierShipments = shipmentQuotes.map((quote) => {
      const rate = pickShippingTierRate(quote.rates, tier);
      if (!rate) {
        const error = new Error(`No shipping rate available for ${quote.sellerName}.`);
        error.statusCode = 502;
        throw error;
      }

      originalShippingCents += rate.rateCents;
      const { minDays, maxDays } = computeDeliveryWindowDays(rate.deliveryDays, quote.prepareDays);
      minDeliveryDays = minDeliveryDays === null ? minDays : Math.max(minDeliveryDays, minDays);
      maxDeliveryDays = maxDeliveryDays === null ? maxDays : Math.max(maxDeliveryDays, maxDays);

      return {
        sellerId: quote.sellerId,
        sellerName: quote.sellerName,
        productIds: quote.productIds,
        productNames: quote.productNames,
        quantity: quote.quantity,
        easypostShipmentId: quote.easypostShipmentId,
        rateId: rate.id || null,
        carrier: rate.carrier || null,
        service: rate.service || null,
        originalShippingCents: rate.rateCents,
        shippingCents: applyShippingMarkup(rate.rateCents),
        originalShipping: dollarsFromCents(rate.rateCents),
        shipping: dollarsFromCents(applyShippingMarkup(rate.rateCents)),
        markupRate: SHIPPING_MARKUP_RATE,
        deliveryDays: rate.deliveryDays,
        deliveryDate: rate.delivery_date || null,
        prepareDays: quote.prepareDays,
        deliveryWindow: buildDeliveryWindowLabel(rate.deliveryDays, quote.prepareDays),
        selectedBox: quote.selectedBox,
        parcel: quote.parcel,
        totalWeightG: quote.totalWeightG,
        shippingTier: tier,
      };
    });

    const shippingCents = tierShipments.reduce((sum, entry) => sum + entry.shippingCents, 0);
    const normalizedWindow = minDeliveryDays !== null && maxDeliveryDays !== null
      ? normalizeDeliveryWindowRange(minDeliveryDays, maxDeliveryDays)
      : computeDeliveryWindowDays(
        null,
        Math.max(...tierShipments.map((entry) => entry.prepareDays || 1))
      );

    return {
      tier,
      label: tier === "economy" ? "Economy" : tier === "standard" ? "Standard" : "Express",
      originalShippingCents,
      shippingCents,
      originalShipping: dollarsFromCents(originalShippingCents),
      shipping: dollarsFromCents(shippingCents),
      deliveryWindow: `${normalizedWindow.minDays}-${normalizedWindow.maxDays} business days`,
      shipments: tierShipments,
    };
  });

  const selectedOption = shippingOptions.find((option) => option.tier === normalizedTier)
    || shippingOptions[0];

  return {
    shippingTier: selectedOption.tier,
    shippingOptions,
    originalShippingCents: selectedOption.originalShippingCents,
    shippingCents: selectedOption.shippingCents,
    originalShipping: selectedOption.originalShipping,
    shipping: selectedOption.shipping,
    markupRate: SHIPPING_MARKUP_RATE,
    shipments: selectedOption.shipments,
    verifiedDestination: destination,
  };
}

function createInitialTrackingPayload(quote, nowIsoTime = new Date().toISOString()) {
  return {
    shipments: (quote?.shipments || []).map((shipment) => ({
      sellerId: shipment.sellerId,
      sellerName: shipment.sellerName,
      productIds: shipment.productIds || [],
      productNames: shipment.productNames || [],
      easypostShipmentId: shipment.easypostShipmentId || null,
      rateId: shipment.rateId || null,
      carrier: shipment.carrier || null,
      service: shipment.service || null,
      status: "pending_shipping",
      statusDetail: "awaiting_label",
      trackingCode: null,
      trackerId: null,
      publicUrl: null,
      estDeliveryDate: shipment.deliveryDate || null,
      deliveryWindow: shipment.deliveryWindow || null,
      prepareDays: shipment.prepareDays || null,
      selectedBox: shipment.selectedBox || null,
      parcel: shipment.parcel || null,
      shippingTier: shipment.shippingTier || null,
      submittedAt: null,
      updatedAt: nowIsoTime,
      events: [
        {
          id: `pending-${shipment.sellerId}-${nowIsoTime}`,
          message: "Pending shipping",
          status: "pending_shipping",
          statusDetail: "awaiting_label",
          datetime: nowIsoTime,
          source: "3dprintings.xyz",
          location: null,
        },
      ],
    })),
    lastUpdatedAt: nowIsoTime,
  };
}

function normalizeTrackingPayload(tracking) {
  if (!tracking || typeof tracking !== "object") {
    return { shipments: [], lastUpdatedAt: null };
  }

  return {
    ...tracking,
    shipments: Array.isArray(tracking.shipments) ? tracking.shipments : [],
    lastUpdatedAt: tracking.lastUpdatedAt || tracking.last_updated_at || null,
  };
}

function trackingEventFromDetail(detail = {}, index = 0) {
  const datetime = detail.datetime || detail.created_at || null;
  const status = detail.status || null;
  const statusDetail = detail.status_detail || null;
  const message = detail.message || detail.description || statusDetail || status || "Tracking update";
  const location = detail.tracking_location && typeof detail.tracking_location === "object"
    ? {
        city: detail.tracking_location.city || null,
        state: detail.tracking_location.state || null,
        country: detail.tracking_location.country || null,
        zip: detail.tracking_location.zip || null,
      }
    : null;

  return {
    id: [datetime, status, statusDetail, message, index].filter((part) => part !== null && part !== undefined).join("|"),
    message,
    status,
    statusDetail,
    datetime,
    source: detail.source || detail.carrier_code || null,
    location,
    estDeliveryDate: detail.est_delivery_date || null,
  };
}

function eventsFromTracker(tracker = {}) {
  const details = Array.isArray(tracker.tracking_details) ? tracker.tracking_details : [];
  return details.map(trackingEventFromDetail);
}

function mergeEvents(existingEvents = [], incomingEvents = []) {
  const merged = [];
  const seen = new Set();
  for (const event of [...existingEvents, ...incomingEvents]) {
    if (!event || typeof event !== "object") continue;
    const key = event.id || [event.datetime, event.status, event.statusDetail, event.message].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }
  merged.sort((left, right) => {
    const leftTime = left.datetime ? new Date(left.datetime).getTime() : 0;
    const rightTime = right.datetime ? new Date(right.datetime).getTime() : 0;
    return leftTime - rightTime;
  });
  return merged;
}

function buildTrackingEvent({ shipment, step, orderId, stepIndex, nowIso }) {
  const sellerKey = shipment.sellerId || shipment.sellerName || "shipment";
  return {
    id: `test-${orderId}-${sellerKey}-${stepIndex}`,
    message: step.message,
    status: step.status,
    statusDetail: step.statusDetail,
    datetime: nowIso,
    source: "test_mode",
    location: step.location || null,
  };
}

function appendTrackingEventToPayload(tracking, { orderId, step, stepIndex, nowIso = new Date().toISOString() }) {
  const normalized = normalizeTrackingPayload(tracking);
  const shipments = normalized.shipments.map((shipment) => {
    const event = buildTrackingEvent({ shipment, step, orderId, stepIndex, nowIso });
    return {
      ...shipment,
      status: step.status,
      statusDetail: step.statusDetail,
      updatedAt: nowIso,
      events: mergeEvents(shipment.events || [], [event]),
    };
  });

  return {
    ...normalized,
    shipments,
    lastUpdatedAt: nowIso,
  };
}

function getDestinationLocationFromOrderItems(itemsPayload) {
  const shippingAddress = itemsPayload && typeof itemsPayload === "object" ? itemsPayload.shippingAddress : null;
  if (!shippingAddress || typeof shippingAddress !== "object") return null;

  const city = normalizeText(shippingAddress.city);
  const state = normalizeText(shippingAddress.state);
  const zip = normalizeText(shippingAddress.zip);
  const country = normalizeText(shippingAddress.country || "US");
  if (!city && !state && !zip && !country) return null;

  return {
    city: city || null,
    state: state || null,
    zip: zip || null,
    country: country || null,
  };
}

function resolveTestTrackingStepLocation(step, destinationLocation) {
  if (!destinationLocation) return step;
  if (!["arrived_at_regional_facility", "out_for_delivery", "delivered"].includes(step.statusDetail)) {
    return step;
  }
  return {
    ...step,
    location: destinationLocation,
  };
}

async function appendTestTrackingStep(pool, orderId, step, stepIndex) {
  const result = await pool.query(
    `SELECT id, items, COALESCE(tracking, '{"shipments":[]}'::jsonb) AS tracking
     FROM orders
     WHERE id = $1`,
    [orderId]
  );
  const order = result.rows[0];
  if (!order) return;

  const destinationLocation = getDestinationLocationFromOrderItems(order.items);
  const resolvedStep = resolveTestTrackingStepLocation(step, destinationLocation);
  const nextTracking = appendTrackingEventToPayload(order.tracking, {
    orderId,
    step: resolvedStep,
    stepIndex,
  });
  await pool.query(
    `UPDATE orders
     SET tracking = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(nextTracking), orderId]
  );
}

function isTestModeEnabled() {
  return ["1", "true", "yes", "on"].includes(normalizeText(process.env.TEST_MODE).toLowerCase());
}

function scheduleTestTrackingTimeline(pool, orderId) {
  if (!isTestModeEnabled() || !orderId || scheduledTestTrackingOrders.has(orderId)) return false;

  scheduledTestTrackingOrders.add(orderId);
  TEST_TRACKING_STEPS.forEach((step, stepIndex) => {
    const delayMs = Math.round(TEST_TRACKING_TIMELINE_MS * step.delayRatio);
    setTimeout(() => {
      appendTestTrackingStep(pool, orderId, step, stepIndex).catch((error) => {
        console.error(`Failed to append test tracking step ${stepIndex} for order ${orderId}:`, error);
      });
      if (stepIndex === TEST_TRACKING_STEPS.length - 1) {
        scheduledTestTrackingOrders.delete(orderId);
      }
    }, delayMs);
  });

  return true;
}

function mergeTrackerIntoShipment(shipment = {}, tracker = {}, nowIso = new Date().toISOString()) {
  const trackerEvents = eventsFromTracker(tracker);
  const fallbackEvent = {
    id: `tracker-${tracker.id || tracker.tracking_code || nowIso}`,
    message: `Tracking ${tracker.status || "updated"}`,
    status: tracker.status || shipment.status || null,
    statusDetail: tracker.status_detail || shipment.statusDetail || null,
    datetime: tracker.updated_at || nowIso,
    source: tracker.carrier || shipment.carrier || null,
    location: null,
  };

  return {
    ...shipment,
    trackerId: tracker.id || shipment.trackerId || null,
    trackingCode: tracker.tracking_code || shipment.trackingCode || null,
    carrier: tracker.carrier || shipment.carrier || null,
    status: tracker.status || shipment.status || "unknown",
    statusDetail: tracker.status_detail || shipment.statusDetail || null,
    publicUrl: tracker.public_url || shipment.publicUrl || null,
    estDeliveryDate: tracker.est_delivery_date || shipment.estDeliveryDate || null,
    updatedAt: tracker.updated_at || nowIso,
    submittedAt: shipment.submittedAt || nowIso,
    events: mergeEvents(shipment.events || [], trackerEvents.length ? trackerEvents : [fallbackEvent]),
  };
}

function addOrUpdateSellerTracker(tracking, { sellerId, sellerName, productIds, productNames, tracker }) {
  const nowIso = new Date().toISOString();
  const normalized = normalizeTrackingPayload(tracking);
  const normalizedSellerId = Number(sellerId);
  const currentShipments = normalized.shipments;
  const shipmentIndex = currentShipments.findIndex((shipment) => Number(shipment.sellerId) === normalizedSellerId);
  const baseShipment = shipmentIndex >= 0
    ? currentShipments[shipmentIndex]
    : {
        sellerId: normalizedSellerId,
        sellerName,
        productIds: productIds || [],
        productNames: productNames || [],
        events: [],
      };

  const nextShipment = mergeTrackerIntoShipment(
    {
      ...baseShipment,
      sellerName: baseShipment.sellerName || sellerName,
      productIds: Array.isArray(baseShipment.productIds) && baseShipment.productIds.length ? baseShipment.productIds : productIds,
      productNames: Array.isArray(baseShipment.productNames) && baseShipment.productNames.length ? baseShipment.productNames : productNames,
    },
    tracker,
    nowIso
  );

  const nextShipments = [...currentShipments];
  if (shipmentIndex >= 0) nextShipments[shipmentIndex] = nextShipment;
  else nextShipments.push(nextShipment);

  return {
    ...normalized,
    shipments: nextShipments,
    lastUpdatedAt: nowIso,
  };
}

function mergeTrackerWebhookPayload(tracking, tracker) {
  const nowIsoTime = new Date().toISOString();
  const normalized = normalizeTrackingPayload(tracking);
  const trackerId = normalizeText(tracker?.id);
  const trackingCode = normalizeText(tracker?.tracking_code).toLowerCase();
  const carrier = normalizeText(tracker?.carrier).toLowerCase();

  const shipments = normalized.shipments.map((shipment) => {
    const shipmentTrackerId = normalizeText(shipment.trackerId);
    const shipmentTrackingCode = normalizeText(shipment.trackingCode).toLowerCase();
    const shipmentCarrier = normalizeText(shipment.carrier).toLowerCase();
    const idMatches = trackerId && shipmentTrackerId === trackerId;
    const codeMatches = trackingCode && shipmentTrackingCode === trackingCode && (!carrier || !shipmentCarrier || carrier === shipmentCarrier);
    if (!idMatches && !codeMatches) return shipment;
    return mergeTrackerIntoShipment(shipment, tracker, nowIsoTime);
  });

  return {
    ...normalized,
    shipments,
    lastUpdatedAt: nowIsoTime,
  };
}

async function mergeTrackerWebhookIntoOrders(pool, tracker) {
  const trackerId = normalizeText(tracker?.id);
  const trackingCode = normalizeText(tracker?.tracking_code);
  const carrier = normalizeText(tracker?.carrier);
  if (!trackerId && !trackingCode) return 0;

  const result = await pool.query(
    `
      SELECT id, COALESCE(tracking, '{}'::jsonb) AS tracking
      FROM orders
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(tracking->'shipments', '[]'::jsonb)) shipment
        WHERE ($1::text <> '' AND shipment->>'trackerId' = $1::text)
           OR (
             $2::text <> ''
             AND lower(COALESCE(shipment->>'trackingCode', '')) = lower($2::text)
             AND (
               $3::text = ''
               OR lower(COALESCE(shipment->>'carrier', '')) = lower($3::text)
               OR COALESCE(shipment->>'carrier', '') = ''
             )
           )
      )
    `,
    [trackerId, trackingCode, carrier]
  );

  let updatedCount = 0;
  for (const row of result.rows) {
    const nextTracking = mergeTrackerWebhookPayload(row.tracking, tracker);
    await pool.query(
      `UPDATE orders SET tracking = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(nextTracking), row.id]
    );
    updatedCount += 1;
  }
  return updatedCount;
}

function filterTrackingForSeller(tracking, sellerId) {
  const normalized = normalizeTrackingPayload(tracking);
  const normalizedSellerId = Number(sellerId);
  return {
    ...normalized,
    shipments: normalized.shipments.filter((shipment) => Number(shipment.sellerId) === normalizedSellerId),
  };
}

function extractShippingAddressFromOrderItems(itemsPayload) {
  if (!itemsPayload || typeof itemsPayload !== "object") return null;
  const normalized = normalizeAddressPayload(itemsPayload.shippingAddress);
  if (!normalized.line1) return null;

  return {
    line1: normalized.line1,
    line2: normalized.line2 || null,
    city: normalized.city || null,
    state: normalized.state || null,
    postalCode: normalized.zip || null,
    country: normalized.country || "US",
  };
}

function getSellerShipmentFromTracking(tracking, sellerId) {
  const normalized = normalizeTrackingPayload(tracking);
  return normalized.shipments.find((shipment) => Number(shipment.sellerId) === Number(sellerId)) || null;
}

function applyLabelToSellerShipment(tracking, sellerId, labelData, nowIso = new Date().toISOString()) {
  const normalized = normalizeTrackingPayload(tracking);
  const normalizedSellerId = Number(sellerId);
  const shipmentIndex = normalized.shipments.findIndex(
    (shipment) => Number(shipment.sellerId) === normalizedSellerId
  );
  if (shipmentIndex < 0) return null;

  const shipment = normalized.shipments[shipmentIndex];
  const nextShipment = {
    ...shipment,
    labelUrl: labelData.labelUrl || shipment.labelUrl || null,
    labelPdfUrl: labelData.labelPdfUrl || shipment.labelPdfUrl || null,
    trackingCode: labelData.trackingCode || shipment.trackingCode || null,
    carrier: labelData.carrier || shipment.carrier || null,
    status: labelData.trackingCode ? "pre_transit" : shipment.status,
    statusDetail: labelData.trackingCode ? "label_created" : shipment.statusDetail,
    purchasedAt: shipment.purchasedAt || nowIso,
    updatedAt: nowIso,
  };

  const nextShipments = [...normalized.shipments];
  nextShipments[shipmentIndex] = nextShipment;
  return {
    ...normalized,
    shipments: nextShipments,
    lastUpdatedAt: nowIso,
  };
}

async function buyEasyPostShipmentLabel(easypostShipmentId, rateId) {
  const shipmentId = normalizeText(easypostShipmentId);
  const normalizedRateId = normalizeText(rateId);
  if (!shipmentId || !normalizedRateId) {
    const error = new Error("Shipment is missing EasyPost identifiers.");
    error.statusCode = 400;
    throw error;
  }

  const client = getEasyPostClient();
  try {
    const bought = await client.Shipment.buy(shipmentId, normalizedRateId);
    const postageLabel = bought?.postage_label && typeof bought.postage_label === "object"
      ? bought.postage_label
      : {};

    return {
      labelUrl: postageLabel.label_url || null,
      labelPdfUrl: postageLabel.label_pdf_url || postageLabel.label_url || null,
      trackingCode: bought.tracking_code || null,
      carrier: bought.selected_rate?.carrier || bought.tracker?.carrier || null,
    };
  } catch (error) {
    const nextError = new Error(error?.message || "Failed to purchase shipping label.");
    nextError.statusCode = Number(error?.statusCode) || Number(error?.status) || 502;
    throw nextError;
  }
}

async function ensureSellerOrderLabel(pool, orderId, sellerId) {
  const orderResult = await pool.query(
    `SELECT id, status, tracking
     FROM orders
     WHERE id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  const order = orderResult.rows[0];
  if (String(order.status).toLowerCase() !== "completed") {
    const error = new Error("Shipping labels are available for completed orders only.");
    error.statusCode = 400;
    throw error;
  }

  const ownershipResult = await pool.query(
    `
      SELECT 1
      FROM orders o
      JOIN LATERAL jsonb_array_elements(COALESCE(o.items->'items', '[]'::jsonb)) AS item ON TRUE
      JOIN products p ON p.id = CASE
        WHEN COALESCE(item->>'id', '') ~ '^\\d+$' THEN (item->>'id')::int
        WHEN COALESCE(item->>'productId', '') ~ '^\\d+$' THEN (item->>'productId')::int
        ELSE NULL
      END
      WHERE o.id = $1 AND p.user_id = $2
      LIMIT 1
    `,
    [orderId, sellerId]
  );

  if (ownershipResult.rows.length === 0) {
    const error = new Error("You do not have access to this order.");
    error.statusCode = 403;
    throw error;
  }

  const shipment = getSellerShipmentFromTracking(order.tracking, sellerId);
  if (!shipment) {
    const error = new Error("No shipment found for this seller on the order.");
    error.statusCode = 404;
    throw error;
  }

  const cachedLabelUrl = normalizeText(shipment.labelPdfUrl || shipment.labelUrl);
  if (cachedLabelUrl) {
    return {
      labelUrl: shipment.labelUrl || cachedLabelUrl,
      labelPdfUrl: shipment.labelPdfUrl || cachedLabelUrl,
      trackingCode: shipment.trackingCode || null,
      carrier: shipment.carrier || null,
      tracking: order.tracking,
    };
  }

  const easypostShipmentId = normalizeText(shipment.easypostShipmentId);
  const rateId = normalizeText(shipment.rateId);
  if (!easypostShipmentId || !rateId) {
    const error = new Error("This order is not ready for label generation yet.");
    error.statusCode = 400;
    throw error;
  }

  const labelData = await buyEasyPostShipmentLabel(easypostShipmentId, rateId);
  const nextTracking = applyLabelToSellerShipment(order.tracking, sellerId, labelData);
  if (!nextTracking) {
    const error = new Error("Failed to update order tracking with label details.");
    error.statusCode = 500;
    throw error;
  }

  await pool.query(
    `UPDATE orders SET tracking = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(nextTracking), orderId]
  );

  return {
    ...labelData,
    tracking: nextTracking,
  };
}

async function fetchLabelBinary(labelUrl) {
  const normalizedUrl = normalizeText(labelUrl);
  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) {
    const error = new Error("Shipping label URL is unavailable.");
    error.statusCode = 404;
    throw error;
  }

  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    const error = new Error("Failed to retrieve shipping label.");
    error.statusCode = 502;
    throw error;
  }

  const contentType = normalizeText(response.headers.get("content-type")) || "application/pdf";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    const error = new Error("Shipping label file is empty.");
    error.statusCode = 502;
    throw error;
  }

  return { buffer, contentType };
}

function validateEasyPostWebhookSignature({ headers, method, rawBody }) {
  const secret = normalizeText(process.env.EASYPOST_WEBHOOK_SECRET);
  if (!secret) {
    return { ok: true, skipped: true, reason: "missing EASYPOST_WEBHOOK_SECRET" };
  }
  try {
    const client = getEasyPostClient();
    const normalizedHeaders = Object.fromEntries(
      Object.entries(headers || {}).map(([key, value]) => [String(key), String(value)])
    );
    const eventBody = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""), "utf8");
    client.Utils.validateWebhook(eventBody, normalizedHeaders, secret);
    return { ok: true, skipped: false };
  } catch (error) {
    return {
      ok: false,
      statusCode: 401,
      reason: error?.message || `Invalid EasyPost signature for ${String(method || "POST").toUpperCase()} webhook`,
    };
  }
}

async function ensureOrderTrackingColumn(pool) {
  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tracking JSONB NOT NULL DEFAULT '{"shipments":[]}'::jsonb
  `);
}

async function ensureSellerAddressColumn(pool) {
  await pool.query(`
    ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS sellersaddres JSONB NOT NULL DEFAULT '{}'::jsonb
  `);
}

module.exports = {
  DEFAULT_SHIPPING_TIER,
  SHIPPING_MARKUP_RATE,
  SHIPPING_TIERS,
  addOrUpdateSellerTracker,
  applyLabelToSellerShipment,
  assertValidShippingTier,
  buildDeliveryWindowLabel,
  buyEasyPostShipmentLabel,
  calculateEasyPostShippingQuote,
  centsFromDollars,
  computeDeliveryWindowDays,
  createEasyPostTracker,
  createInitialTrackingPayload,
  dollarsFromCents,
  ensureOrderTrackingColumn,
  ensureSellerAddressColumn,
  ensureSellerOrderLabel,
  extractShippingAddressFromOrderItems,
  fetchLabelBinary,
  filterTrackingForSeller,
  getSellerShipmentFromTracking,
  mergeTrackerWebhookIntoOrders,
  normalizeAddressPayload,
  normalizeSellerAddressFromRow,
  normalizeShippingTier,
  resolveVerifiedShippingAddress,
  scheduleTestTrackingTimeline,
  validateEasyPostWebhookSignature,
  validateUsAddress,
  verifyAddressWithEasyPost,
};
