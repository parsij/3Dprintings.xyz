export function getOrderItemsArray(itemsPayload) {
  if (Array.isArray(itemsPayload)) return itemsPayload;
  if (itemsPayload && typeof itemsPayload === "object" && Array.isArray(itemsPayload.items)) {
    return itemsPayload.items;
  }
  return [];
}

function collectSellerIds(itemsPayload, tracking) {
  const sellerIds = new Set();

  const trackingShipments = tracking?.shipments;
  if (Array.isArray(trackingShipments)) {
    for (const shipment of trackingShipments) {
      const sellerId = Number(shipment?.sellerId);
      if (Number.isFinite(sellerId) && sellerId > 0) {
        sellerIds.add(sellerId);
      }
    }
  }

  const quoteShipments = itemsPayload?.shippingQuote?.shipments;
  if (Array.isArray(quoteShipments)) {
    for (const shipment of quoteShipments) {
      const sellerId = Number(shipment?.sellerId);
      if (Number.isFinite(sellerId) && sellerId > 0) {
        sellerIds.add(sellerId);
      }
    }
  }

  for (const item of getOrderItemsArray(itemsPayload)) {
    const sellerId = Number(item?.sellerId ?? item?.seller_id);
    if (Number.isFinite(sellerId) && sellerId > 0) {
      sellerIds.add(sellerId);
    }
  }

  return sellerIds;
}

export function orderHasMultipleSellers({ items, tracking }) {
  const orderItems = getOrderItemsArray(items);
  if (orderItems.length < 2) return false;
  return collectSellerIds(items, tracking).size >= 2;
}

export function getSellerIdForItem(item, itemsPayload, tracking) {
  const directSellerId = Number(item?.sellerId ?? item?.seller_id);
  if (Number.isFinite(directSellerId) && directSellerId > 0) {
    return directSellerId;
  }

  const productId = Number(item?.id ?? item?.productId ?? item?.product_id);
  const candidateShipments = [
    ...(Array.isArray(itemsPayload?.shippingQuote?.shipments) ? itemsPayload.shippingQuote.shipments : []),
    ...(Array.isArray(tracking?.shipments) ? tracking.shipments : []),
  ];

  for (const shipment of candidateShipments) {
    const sellerId = Number(shipment?.sellerId);
    if (!Number.isFinite(sellerId) || sellerId <= 0) continue;

    const productIds = (shipment.productIds || []).map((value) => Number(value));
    if (Number.isFinite(productId) && productId > 0 && productIds.includes(productId)) {
      return sellerId;
    }

    if (item?.name && (shipment.productNames || []).includes(item.name)) {
      return sellerId;
    }
  }

  return null;
}

export function getTrackingForItem(item, { items: itemsPayload, tracking }) {
  const shipments = Array.isArray(tracking?.shipments) ? tracking.shipments : [];
  const productId = Number(item?.id ?? item?.productId ?? item?.product_id);

  if (Number.isFinite(productId) && productId > 0) {
    const shipmentByProductId = shipments.find((entry) =>
      (entry.productIds || []).map((value) => Number(value)).includes(productId)
    );
    if (shipmentByProductId) {
      return {
        shipments: [shipmentByProductId],
        lastUpdatedAt: tracking?.lastUpdatedAt || shipmentByProductId.updatedAt || null,
      };
    }
  }

  if (item?.name) {
    const shipmentByName = shipments.find((entry) =>
      (entry.productNames || []).includes(item.name)
    );
    if (shipmentByName) {
      return {
        shipments: [shipmentByName],
        lastUpdatedAt: tracking?.lastUpdatedAt || shipmentByName.updatedAt || null,
      };
    }
  }

  const sellerId = getSellerIdForItem(item, itemsPayload, tracking);
  let shipment = null;
  if (sellerId != null) {
    shipment = shipments.find((entry) => Number(entry.sellerId) === sellerId) || null;
  }

  return {
    shipments: shipment ? [shipment] : [],
    lastUpdatedAt: tracking?.lastUpdatedAt || shipment?.updatedAt || null,
  };
}

export function formatOrderNumber(orderId) {
  const normalized = String(orderId || "").replace(/-/g, "").toUpperCase();
  if (normalized.length >= 8) {
    return `#${normalized.slice(0, 8)}`;
  }
  return normalized ? `#${normalized}` : "Order";
}

export function getOrderMessagingTargets(order) {
  const targets = new Map();

  const shipments = [
    ...(Array.isArray(order?.tracking?.shipments) ? order.tracking.shipments : []),
    ...(Array.isArray(order?.items?.shippingQuote?.shipments) ? order.items.shippingQuote.shipments : []),
  ];

  for (const shipment of shipments) {
    const sellerDbId = Number(shipment?.sellerId);
    if (!Number.isInteger(sellerDbId) || sellerDbId <= 0) {
      continue;
    }

    if (!targets.has(sellerDbId)) {
      targets.set(sellerDbId, {
        sellerDbId,
        sellerName: shipment?.sellerName || "Seller",
        trackingCode: shipment?.trackingCode || null,
      });
    }
  }

  return [...targets.values()];
}
