import React from "react";

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

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-2xs">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Order ID</p>
          <h2 className="break-all font-mono text-sm font-semibold text-gray-900">{order.id}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {order.customerUsername || "Customer"}
            {order.customerEmail ? <span className="text-gray-400"> &middot; {order.customerEmail}</span> : null}
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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-155 text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2 pr-3 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Quantity</th>
              <th className="px-3 py-2 font-semibold">Unit Price</th>
              <th className="py-2 pl-3 text-right font-semibold">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(Array.isArray(order.items) ? order.items : []).map((item) => (
              <tr key={`${order.id}-${item.productId}`}>
                <td className="py-3 pr-3 font-medium text-gray-900">{item.productName}</td>
                <td className="px-3 py-3 text-gray-700">{Number(item.quantity) || 0}</td>
                <td className="px-3 py-3 text-gray-700">{formatCurrency(item.unitPrice)}</td>
                <td className="py-3 pl-3 text-right font-semibold text-gray-900">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase text-gray-500">Total Order Amount</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
        </div>
      </div>
    </article>
  );
}

