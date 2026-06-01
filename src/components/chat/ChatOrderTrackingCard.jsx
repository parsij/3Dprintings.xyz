import { Link } from "react-router-dom";
import { formatConversationStartedAt } from "../../utils/chatFormatting.js";

function TrackingIcon({ compact }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 ${
        compact ? "h-14 w-14" : "h-16 w-16"
      }`}
    >
      <svg className={compact ? "h-7 w-7" : "h-8 w-8"} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 12 21 7.5M12 12v9M12 12 3 7.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function normalizeTrackingCode(value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.toLowerCase() === "pending") {
    return null;
  }
  return normalized;
}

function formatTrackingStatus(status) {
  const normalized = String(status || "").replaceAll("_", " ").trim();
  if (!normalized) return "Pending shipping";
  if (normalized.toLowerCase() === "pending tracking") return "Pending shipping";
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function ChatOrderTrackingCard({ order, compact = false }) {
  if (!order?.orderId) {
    return null;
  }

  const orderNumber = order.orderNumber || "Order";
  const trackingCode = normalizeTrackingCode(order.trackingCode || order.orderTrackingCode);
  const trackingStatus = formatTrackingStatus(order.trackingStatus || order.orderTrackingStatus);
  const orderedAt = formatConversationStartedAt(order.orderCreatedAt || order.createdAt);
  const orderTrackingPath = `/account/orders/${encodeURIComponent(order.orderId)}#tracking`;

  return (
    <Link
      to={orderTrackingPath}
      className={`flex items-center gap-3 rounded-2xl border border-blue-100 bg-white/90 shadow-sm transition hover:border-orange-200 hover:bg-orange-50/40 ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <TrackingIcon compact={compact} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{orderNumber}</p>
        <p className="mt-0.5 truncate text-xs text-gray-600">
          Status: <span className="font-medium text-gray-800">{trackingStatus}</span>
        </p>
        {trackingCode ? (
          <p className="mt-0.5 truncate text-xs text-gray-500">
            Tracking: <span className="font-mono text-gray-700">{trackingCode}</span>
          </p>
        ) : null}
        {orderedAt ? (
          <p className="mt-1 text-xs text-gray-500">Ordered {orderedAt}</p>
        ) : null}
        <p className="mt-1 text-xs font-medium text-orange-600">View order tracking</p>
      </div>
    </Link>
  );
}

export default ChatOrderTrackingCard;
