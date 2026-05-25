const crypto = require("crypto");
const axios = require("axios");

const EASYPOST_API_BASE = "https://api.easypost.com/v2";
const SHIPPING_MARKUP_RATE = 0.165;
const DEFAULT_PARCEL = {
  length: Number(process.env.EASYPOST_DEFAULT_PARCEL_LENGTH_IN || 8),
  width: Number(process.env.EASYPOST_DEFAULT_PARCEL_WIDTH_IN || 6),
  height: Number(process.env.EASYPOST_DEFAULT_PARCEL_HEIGHT_IN || 4),
  weight: Number(process.env.EASYPOST_DEFAULT_PARCEL_WEIGHT_OZ || 16),
};
const US_STATE_CODE_REGEX = /^[A-Z]{2}$/;
const US_POSTAL_CODE_REGEX = /^\d{5}(?:-\d{4})?$/;

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

function getEasyPostApiKey() {
  return normalizeText(process.env.EASYPOST_API_KEY);
}

async function easyPostRequest(method, path, data) {
  const apiKey = getEasyPostApiKey();
  if (!apiKey) {
    const error = new Error("Missing EASYPOST_API_KEY on server.");
    error.statusCode = 500;
    throw error;
  }

  try {
    const response = await axios({
      method,
      url: `${EASYPOST_API_BASE}${path}`,
      data,
      auth: { username: apiKey, password: "" },
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      "EasyPost request failed.";
    const nextError = new Error(message);
    nextError.statusCode = error?.response?.status || 502;
    nextError.responseData = error?.response?.data;
    throw nextError;
  }
}

async function createEasyPostShipment(shipment) {
  return easyPostRequest("post", "/shipments", { shipment });
}

async function createEasyPostTracker({ trackingCode, carrier }) {
  const tracker = {
    tracking_code: normalizeText(trackingCode),
  };
  const normalizedCarrier = normalizeText(carrier);
  if (normalizedCarrier) tracker.carrier = normalizedCarrier;
  return easyPostRequest("post", "/trackers", { tracker });
}

function chooseCheapestRate(rates = []) {
  console.log("rates" + rates)
  return rates
    .map((rate) => ({
      ...rate,
      rateCents: centsFromDollars(rate?.rate),
    }))
    .filter((rate) => rate.rateCents > 0 && String(rate.currency || "USD").toUpperCase() === "USD")
    .sort((left, right) => left.rateCents - right.rateCents)[0] || null;
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

async function calculateEasyPostShippingQuote({ items, toAddress }) {
  const destination = normalizeAddressPayload({ ...toAddress, residential: true });
  const destinationError = validateUsAddress(destination, "shipping address", { requireStreetNumber: true });
  if (destinationError) {
    const error = new Error(destinationError);
    error.statusCode = 400;
    throw error;
  }

  const groups = groupItemsBySeller(items);
  if (groups.length === 0) {
    const error = new Error("No seller shipments to rate.");
    error.statusCode = 400;
    throw error;
  }

  const shipments = [];
  for (const group of groups) {
    const sellerAddress = normalizeAddressPayload(group.sellerAddress);
    const sellerAddressError = validateUsAddress(sellerAddress, `${group.sellerName} fulfillment address`, {
      requireStreetNumber: true,
    });
    if (sellerAddressError) {
      const error = new Error(sellerAddressError);
      error.statusCode = 400;
      throw error;
    }

    const shipment = await createEasyPostShipment({
      to_address: buildEasyPostAddress(destination, {
        name: "3D Printings Customer",
      }),
      from_address: buildEasyPostAddress(sellerAddress, {
        name: group.sellerName,
      }),
      parcel: buildParcelForItems(group.items),
    });

    const rate = chooseCheapestRate(shipment?.rates || []);
    if (!rate) {
      const error = new Error(`No EasyPost shipping rates found for ${group.sellerName}.`);
      error.statusCode = 502;
      throw error;
    }

    const originalShippingCents = rate.rateCents;
    const shippingCents = Math.ceil(originalShippingCents * (1 + SHIPPING_MARKUP_RATE));
    shipments.push({
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      productIds: group.items.map((item) => Number(item.id || item.productId)).filter(Number.isFinite),
      productNames: group.items.map((item) => item.name).filter(Boolean),
      quantity: group.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
      easypostShipmentId: shipment.id || null,
      rateId: rate.id || null,
      carrier: rate.carrier || null,
      service: rate.service || null,
      originalShippingCents,
      shippingCents,
      originalShipping: dollarsFromCents(originalShippingCents),
      shipping: dollarsFromCents(shippingCents),
      markupRate: SHIPPING_MARKUP_RATE,
      deliveryDays: rate.delivery_days ?? rate.est_delivery_days ?? null,
      deliveryDate: rate.delivery_date || null,
    });
  }

  const originalShippingCents = shipments.reduce((sum, shipment) => sum + shipment.originalShippingCents, 0);
  const shippingCents = shipments.reduce((sum, shipment) => sum + shipment.shippingCents, 0);

  return {
    originalShippingCents,
    shippingCents,
    originalShipping: dollarsFromCents(originalShippingCents),
    shipping: dollarsFromCents(shippingCents),
    markupRate: SHIPPING_MARKUP_RATE,
    shipments,
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
      status: "pending_tracking",
      statusDetail: "awaiting_seller_tracking",
      trackingCode: null,
      trackerId: null,
      publicUrl: null,
      estDeliveryDate: shipment.deliveryDate || null,
      submittedAt: null,
      updatedAt: nowIsoTime,
      events: [
        {
          id: `pending-${shipment.sellerId}-${nowIsoTime}`,
          message: "Pending Shipping from seller",
          status: "pending_Shipping",
          statusDetail: "awaiting_seller_tracking",
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
   console.log("tracker", tracker);
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

function parseEasyPostTimestamp(timestampHeader) {
  const parsedMs = Date.parse(timestampHeader);
  if (!Number.isFinite(parsedMs)) return null;
  return Math.floor(parsedMs / 1000);
}

function timingSafeHexEqual(left, right) {
  const normalizedLeft = normalizeText(left).toLowerCase();
  const normalizedRight = normalizeText(right).toLowerCase();
  if (!/^[a-f0-9]+$/.test(normalizedLeft) || !/^[a-f0-9]+$/.test(normalizedRight)) return false;
  const leftBuffer = Buffer.from(normalizedLeft, "hex");
  const rightBuffer = Buffer.from(normalizedRight, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateEasyPostWebhookSignature({ headers, method, rawBody }) {
  const secret = normalizeText(process.env.EASYPOST_WEBHOOK_SECRET);
  if (!secret) {
    return { ok: true, skipped: true, reason: "missing EASYPOST_WEBHOOK_SECRET" };
  }

  const timestamp = normalizeText(headers["x-timestamp"]);
  const requestPath = normalizeText(headers["x-path"]);
  const signatureHeader = normalizeText(headers["x-hmac-signature-v2"] || headers["x-hmac-signature"]);
  if (!timestamp || !requestPath || !signatureHeader) {
    return { ok: false, statusCode: 401, reason: "Missing EasyPost HMAC headers" };
  }

  const timestampSeconds = parseEasyPostTimestamp(timestamp);
  if (!timestampSeconds) {
    return { ok: false, statusCode: 401, reason: "Invalid EasyPost HMAC timestamp" };
  }

  const toleranceMinutes = Math.min(60, Math.max(0, Number(process.env.EASYPOST_WEBHOOK_TOLERANCE_MINUTES || 1)));
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - timestampSeconds > toleranceMinutes * 60) {
    return { ok: false, statusCode: 401, reason: "EasyPost HMAC timestamp is too old" };
  }
  if (timestampSeconds - nowSeconds > 30) {
    return { ok: false, statusCode: 401, reason: "EasyPost HMAC timestamp is in the future" };
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}${String(method || "POST").toUpperCase()}${requestPath}${rawBody}`, "utf8")
    .digest("hex");
  const received = signatureHeader.replace(/^hmac-sha256-hex=/i, "");
  if (!timingSafeHexEqual(expected, received)) {
    return { ok: false, statusCode: 401, reason: "Invalid EasyPost HMAC signature" };
  }

  return { ok: true, skipped: false };
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
  SHIPPING_MARKUP_RATE,
  addOrUpdateSellerTracker,
  calculateEasyPostShippingQuote,
  centsFromDollars,
  createEasyPostTracker,
  createInitialTrackingPayload,
  dollarsFromCents,
  ensureOrderTrackingColumn,
  ensureSellerAddressColumn,
  filterTrackingForSeller,
  mergeTrackerWebhookIntoOrders,
  normalizeAddressPayload,
  normalizeSellerAddressFromRow,
  validateEasyPostWebhookSignature,
  validateUsAddress,
};
