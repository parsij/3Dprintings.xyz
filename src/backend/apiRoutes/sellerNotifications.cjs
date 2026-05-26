const { escapeHtml, isMailConfigured, sendEmail } = require("./mailShared.cjs");
const { getSellerFrontendUrl } = require("../envShared.cjs");

function readSellerPreferences(rawPreferences) {
  const preferences = rawPreferences && typeof rawPreferences === "object" ? rawPreferences : {};
  return {
    notifyNewOrders: preferences.notifyNewOrders !== false,
    notifyNewReviews: preferences.notifyNewReviews !== false,
    supportEmail: String(preferences.supportEmail || "").trim().toLowerCase(),
  };
}

function resolveSellerRecipientEmail(row) {
  const preferences = readSellerPreferences(row.seller_preferences);
  if (preferences.supportEmail) return preferences.supportEmail;
  return String(row.email || "").trim().toLowerCase();
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

async function notifySellersOfNewOrder(pool, orderId) {
  if (!isMailConfigured()) return;

  const orderResult = await pool.query(
    `SELECT id, items, total_amount, created_at
     FROM orders
     WHERE id = $1
     LIMIT 1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) return;

  const order = orderResult.rows[0];
  const items = Array.isArray(order.items?.items) ? order.items.items : [];
  if (items.length === 0) return;

  const productIds = [
    ...new Set(
      items
        .map((item) => Number(item.id || item.productId))
        .filter((productId) => Number.isInteger(productId) && productId > 0)
    ),
  ];

  if (productIds.length === 0) return;

  const productsResult = await pool.query(
    `SELECT p.id, p.name, p.user_id AS seller_id, p.current_price,
            u.email, u.seller_preferences
     FROM products p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = ANY($1::int[])`,
    [productIds]
  );

  const productById = new Map(productsResult.rows.map((row) => [Number(row.id), row]));
  const sellerItems = new Map();

  for (const item of items) {
    const productId = Number(item.id || item.productId);
    const product = productById.get(productId);
    if (!product) continue;

    const sellerId = Number(product.seller_id);
    if (!sellerItems.has(sellerId)) {
      sellerItems.set(sellerId, {
        seller: product,
        lines: [],
      });
    }

    const quantity = Number.parseInt(item.quantity, 10) || 0;
    const unitPrice = Number(item.current_price ?? item.price ?? product.current_price ?? 0);
    sellerItems.get(sellerId).lines.push({
      productName: item.name || product.name || "Product",
      quantity,
      lineTotal: unitPrice * quantity,
    });
  }

  const ordersUrl = `${getSellerFrontendUrl()}/orders`;

  for (const { seller, lines } of sellerItems.values()) {
    const preferences = readSellerPreferences(seller.seller_preferences);
    if (!preferences.notifyNewOrders) continue;

    const recipient = resolveSellerRecipientEmail(seller);
    if (!recipient) continue;

    const lineItemsHtml = lines
      .map(
        (line) => `<li>${escapeHtml(line.productName)} x ${line.quantity} (${formatMoney(line.lineTotal)})</li>`
      )
      .join("");

    await sendEmail({
      to: recipient,
      subject: "New order on 3D Printings",
      html: `
        <p>You received a new order on 3D Printings.</p>
        <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
        <p><strong>Items:</strong></p>
        <ul>${lineItemsHtml}</ul>
        <p><a href="${escapeHtml(ordersUrl)}">View your seller orders</a></p>
      `,
    });
  }
}

async function notifySellerOfNewReview(pool, {
  productId,
  rating,
  content,
  reviewerUsername,
}) {
  if (!isMailConfigured()) return;

  const productResult = await pool.query(
    `SELECT p.id, p.name, p.user_id AS seller_id,
            u.email, u.seller_preferences
     FROM products p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1
     LIMIT 1`,
    [productId]
  );

  if (productResult.rows.length === 0) return;

  const product = productResult.rows[0];
  const preferences = readSellerPreferences(product.seller_preferences);
  if (!preferences.notifyNewReviews) return;

  const recipient = resolveSellerRecipientEmail(product);
  if (!recipient) return;

  const reviewsUrl = `${getSellerFrontendUrl()}/reviews`;
  const reviewSnippet = String(content || "").trim();
  const safeSnippet = reviewSnippet
    ? escapeHtml(reviewSnippet.slice(0, 500))
    : "No written review was included.";

  await sendEmail({
    to: recipient,
    subject: `New review on ${product.name}`,
    html: `
      <p>Your product <strong>${escapeHtml(product.name)}</strong> received a new review.</p>
      <p><strong>Rating:</strong> ${Number(rating)}/5</p>
      <p><strong>Reviewer:</strong> ${escapeHtml(reviewerUsername || "Customer")}</p>
      <p><strong>Review:</strong> ${safeSnippet}</p>
      <p><a href="${escapeHtml(reviewsUrl)}">View seller reviews</a></p>
    `,
  });
}

module.exports = {
  notifySellerOfNewReview,
  notifySellersOfNewOrder,
};
