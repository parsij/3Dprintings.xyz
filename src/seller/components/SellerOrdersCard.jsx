import { useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import TrackingSection from "../../components/TrackingSection.jsx";
import {
  downloadSellerOrderLabel,
  getSellerOrderLabelViewUrl,
} from "../services/sellerPortalService.js";

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

function formatShippingAddress(shippingAddress) {
  if (!shippingAddress || typeof shippingAddress !== "object") return [];

  const lines = [];
  const line1 = shippingAddress.line1 || shippingAddress.street;
  const line2 = shippingAddress.line2 || shippingAddress.street2;
  const city = shippingAddress.city;
  const state = shippingAddress.state;
  const postalCode = shippingAddress.postalCode || shippingAddress.zip;
  const country = shippingAddress.country;

  if (line1) lines.push(line1);
  if (line2) lines.push(line2);

  const cityLine = [city, state, postalCode].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  if (country) lines.push(country);

  return lines;
}

export default function SellerOrdersCard({ order }) {
  const [labelLoading, setLabelLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [labelError, setLabelError] = useState("");
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelViewUrl, setLabelViewUrl] = useState("");

  const addressLines = useMemo(
    () => formatShippingAddress(order.shippingAddress),
    [order.shippingAddress]
  );
  const items = Array.isArray(order.items) ? order.items : [];
  const canManageLabel = String(order.status || "").toLowerCase() === "completed";

  async function handleViewLabel() {
    setLabelError("");
    setLabelLoading(true);
    try {
      const viewUrl = await getSellerOrderLabelViewUrl(order.id);
      setLabelViewUrl(viewUrl);
      setShowLabelModal(true);
    } catch (error) {
      setLabelError(error?.response?.data?.message || "Failed to load shipping label.");
    } finally {
      setLabelLoading(false);
    }
  }

  async function handleDownloadLabel() {
    setLabelError("");
    setDownloadLoading(true);
    try {
      await downloadSellerOrderLabel(order.id);
    } catch (error) {
      setLabelError(error?.response?.data?.message || "Failed to download shipping label.");
    } finally {
      setDownloadLoading(false);
    }
  }

  function closeLabelModal() {
    setShowLabelModal(false);
    setLabelViewUrl("");
  }

  return (
    <>
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
                  {addressLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">No shipping address provided</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusStyles(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
              <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
            </div>

            {canManageLabel ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewLabel}
                  disabled={labelLoading || downloadLoading}
                  className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {labelLoading ? "Loading..." : "View Label"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadLabel}
                  disabled={labelLoading || downloadLoading}
                  aria-label="Download shipping label"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {labelError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{labelError}</p>
        ) : null}

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
                  <div key={`${order.id}-${productId}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
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
        </div>
      </article>

      {showLabelModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Shipping Label</h3>
              <button
                type="button"
                onClick={closeLabelModal}
                aria-label="Close label preview"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              title={`Shipping label for order ${order.id}`}
              src={labelViewUrl}
              className="h-full w-full flex-1 bg-gray-100"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
