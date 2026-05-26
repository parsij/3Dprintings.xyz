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
