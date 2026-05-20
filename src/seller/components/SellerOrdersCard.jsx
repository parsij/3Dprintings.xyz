import React from "react";
import { Link } from "react-router-dom";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

function formatCurrency(value) {
  const amount = Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) return "Unknown date";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getStatusStyles(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "bg-green-50 text-green-700";
  if (normalized === "cancelled") return "bg-red-50 text-red-700";
  if (normalized === "pending") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

function getStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (!normalized) return "Unknown";
  return normalized[0].toUpperCase() + normalized.slice(1);
}

export default function SellerOrdersCard({ order }) {
  const { shippingAddress } = order;
  const addressLines = [];
  if (shippingAddress) {
    if (shippingAddress.street) addressLines.push(shippingAddress.street);
    const line2 = [shippingAddress.city, shippingAddress.state, shippingAddress.postalCode].filter(Boolean).join(", ");
    if (line2) addressLines.push(line2);
    if (shippingAddress.country) addressLines.push(shippingAddress.country);
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Order ID</p>
          <h2 className="break-all font-mono text-sm font-semibold text-gray-900">{order.id}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {order.customerUsername || "Customer"}
          </p>
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase text-gray-500">Shipping Address</p>
            {addressLines.length > 0 ? (
              <div className="text-sm text-gray-700 mt-1">
                {addressLines.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">No shipping address provided</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusStyles(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900">Items</p>
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">No items in this order.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const quantity = Number(item.quantity) || 0;
              const unitPrice = Number(item.unitPrice) || 0;
              const lineTotal = Number(item.lineTotal) || 0;
              const productId = item.productId;
              const hasProductLink = Number.isFinite(Number(productId)) && Number(productId) > 0;
              const productPath = hasProductLink ? `/product/${encodeURIComponent(String(productId))}` : null;

              return (
                <div key={`${order.id}-${item.productId}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {item.imageUrl ? (
                        hasProductLink ? (
                          <Link to={productPath} className="block shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="h-14 w-14 rounded-md object-cover border border-gray-200 shrink-0 hover:scale-115 transition-transform transform-gpu backface-hidden"
                              loading="lazy"
                            />
                          </Link>
                        ) : (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-14 w-14 rounded-md object-cover border border-gray-200 shrink-0 hover:scale-115 transition-transform transform-gpu backface-hidden"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="h-14 w-14 rounded-md bg-gray-200 flex items-center justify-center shrink-0 border border-gray-200 text-xs text-gray-400">
                          No Img
                        </div>
                      )}

                      <div className="min-w-0">
                        {hasProductLink ? (
                          <Link to={productPath} className="font-medium text-gray-900 hover:text-orange-600 transition-colors duration-250">
                            {item.productName}
                          </Link>
                        ) : (
                          <p className="font-medium text-gray-900">{item.productName}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          Quantity: {quantity} x {formatCurrency(unitPrice)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(lineTotal)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
        <div className="text-right">
          <p className="text-xs font-semibold uppercase text-gray-500">Total Amount</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
        </div>
      </div>
    </article>
  );
}