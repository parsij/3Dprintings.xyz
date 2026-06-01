const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatOrderNumber(orderId) {
  const normalized = String(orderId || "").replace(/-/g, "").toUpperCase();
  if (normalized.length >= 8) {
    return `#${normalized.slice(0, 8)}`;
  }
  return normalized ? `#${normalized}` : "Order";
}

function getOrderItemsFromPayload(itemsPayload) {
  if (Array.isArray(itemsPayload)) {
    return itemsPayload;
  }
  if (itemsPayload && typeof itemsPayload === "object" && Array.isArray(itemsPayload.items)) {
    return itemsPayload.items;
  }
  return [];
}

function collectOrderSellerIds(orderRow) {
  const sellerIds = new Set();
  const itemsPayload = orderRow?.items;

  for (const item of getOrderItemsFromPayload(itemsPayload)) {
    const sellerId = Number(item?.sellerId ?? item?.seller_id);
    if (Number.isInteger(sellerId) && sellerId > 0) {
      sellerIds.add(sellerId);
    }
  }

  const quoteShipments = itemsPayload?.shippingQuote?.shipments;
  if (Array.isArray(quoteShipments)) {
    for (const shipment of quoteShipments) {
      const sellerId = Number(shipment?.sellerId);
      if (Number.isInteger(sellerId) && sellerId > 0) {
        sellerIds.add(sellerId);
      }
    }
  }

  const trackingShipments = orderRow?.tracking?.shipments;
  if (Array.isArray(trackingShipments)) {
    for (const shipment of trackingShipments) {
      const sellerId = Number(shipment?.sellerId);
      if (Number.isInteger(sellerId) && sellerId > 0) {
        sellerIds.add(sellerId);
      }
    }
  }

  return [...sellerIds];
}

function getTrackingCodeForSeller(tracking, sellerDbId) {
  const normalizedSellerId = Number(sellerDbId);
  const shipments = Array.isArray(tracking?.shipments) ? tracking.shipments : [];
  const shipment = shipments.find((entry) => Number(entry?.sellerId) === normalizedSellerId);
  const trackingCode = String(shipment?.trackingCode || "").trim();
  return trackingCode || null;
}

async function loadOrderContextForSeller(pool, { orderId, sellerDbId, buyerDbId }) {
  const normalizedOrderId = String(orderId || "").trim();
  const parsedSellerDbId = Number(sellerDbId);
  const parsedBuyerDbId = Number(buyerDbId);

  if (!UUID_REGEX.test(normalizedOrderId)) {
    return null;
  }

  if (!Number.isInteger(parsedSellerDbId) || parsedSellerDbId <= 0) {
    return null;
  }

  if (!Number.isInteger(parsedBuyerDbId) || parsedBuyerDbId <= 0) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, customer_id, created_at, tracking, items
     FROM orders
     WHERE id = $1
       AND customer_id = $2
     LIMIT 1`,
    [normalizedOrderId, parsedBuyerDbId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const orderRow = result.rows[0];
  const sellerIds = collectOrderSellerIds(orderRow);

  if (!sellerIds.includes(parsedSellerDbId)) {
    return null;
  }

  return {
    orderId: orderRow.id,
    orderNumber: formatOrderNumber(orderRow.id),
    trackingCode: getTrackingCodeForSeller(orderRow.tracking, parsedSellerDbId),
    orderCreatedAt: orderRow.created_at,
    sellerDbId: parsedSellerDbId,
  };
}

module.exports = {
  UUID_REGEX,
  collectOrderSellerIds,
  formatOrderNumber,
  getTrackingCodeForSeller,
  loadOrderContextForSeller,
};
