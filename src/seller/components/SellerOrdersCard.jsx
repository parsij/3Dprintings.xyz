import { useEffect, useState } from "react";
import TrackingSection from "../../components/TrackingSection.jsx";
import { addSellerOrderTracking } from "../services/sellerPortalService.js";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

const MARKETPLACE_ORIGIN = "https://3dprintings.xyz";

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

function getMarketplaceProductUrl(productId) {
  if (!Number.isFinite(Number(productId)) || Number(productId) <= 0) return null;
  return `${MARKETPLACE_ORIGIN}/product/${encodeURIComponent(String(productId))}`;
}

export default function SellerOrdersCard({ order, onTrackingSaved }) {
  const existingShipment = Array.isArray(order.tracking?.shipments) ? order.tracking.shipments[0] : null;
  const [trackingCode, setTrackingCode] = useState(existingShipment?.trackingCode || "");
  const [carrier, setCarrier] = useState(existingShipment?.carrier || "");
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const { shippingAddress } = order;
  const addressLines = [];
  if (shippingAddress) {
    if (shippingAddress.street) addressLines.push(shippingAddress.street);
    if (shippingAddress.street2) addressLines.push(shippingAddress.street2);
    const line2 = [shippingAddress.city, shippingAddress.state, shippingAddress.postalCode].filter(Boolean).join(", ");
    if (line2) addressLines.push(line2);
    if (shippingAddress.country) addressLines.push(shippingAddress.country);
  }

  const items = Array.isArray(order.items) ? order.items : [];

  useEffect(() => {
    setTrackingCode(existingShipment?.trackingCode || "");
    setCarrier(existingShipment?.carrier || "");
  }, [existingShipment?.trackingCode, existingShipment?.carrier]);

  async function handleTrackingSubmit(event) {
    event.preventDefault();
    setTrackingMessage("");
    setTrackingError("");

    if (!trackingCode.trim()) {
      setTrackingError("Enter a tracking number.");
      return;
    }

    try {
      setTrackingSaving(true);
      const response = await addSellerOrderTracking(order.id, {
        trackingCode: trackingCode.trim(),
        carrier: carrier.trim(),
      });
      setTrackingMessage(response?.message || "Tracking saved.");
      await onTrackingSaved?.();
    } catch (error) {
      setTrackingError(error?.response?.data?.message || "Failed to save tracking.");
    } finally {
      setTrackingSaving(false);
    }
  }

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
            {items.map((item, index) => {
               const quantity = Number(item.quantity) || 0;
               const unitPrice = Number(item.unitPrice) || 0;
               const lineTotal = Number(item.lineTotal) || 0;
               const productId = item.productId;
               const productUrl = getMarketplaceProductUrl(productId);
               const hasProductLink = Boolean(productUrl);

               return (
                 <div key={`${order.id}-${item.productId}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                   <div className="flex items-start justify-between gap-3">
                     <div className="flex items-start gap-3 min-w-0">
                       {item.imageUrl ? (
                         hasProductLink ? (
                           <a href={productUrl} target="_self" className="block shrink-0">
                             <img
                               src={item.imageUrl}
                               alt={item.productName}
                               className="h-14 w-14 rounded-md object-cover border border-gray-200 shrink-0 hover:scale-115 transition-transform transform-gpu backface-hidden"
                               loading="lazy"
                             />
                           </a>
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
                           <a href={productUrl} target="_self" className="font-medium text-gray-900 hover:text-orange-600 transition-colors duration-250">
                             {item.productName}
                           </a>
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

      <div className="border-t border-gray-100 pt-4">
        <TrackingSection tracking={order.tracking} title="Tracking" />

        <form className="mt-3 grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleTrackingSubmit}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Carrier</label>
            <input
              type="text"
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder="USPS, UPS, FedEx"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Tracking Number</label>
            <input
              type="text"
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              placeholder="Tracking number"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={trackingSaving}
              className="w-full rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 md:w-auto"
            >
              {trackingSaving ? "Saving..." : "Save Tracking"}
            </button>
          </div>
          {trackingMessage ? <p className="text-sm text-green-700 md:col-span-3">{trackingMessage}</p> : null}
          {trackingError ? <p className="text-sm text-red-600 md:col-span-3">{trackingError}</p> : null}
        </form>
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
