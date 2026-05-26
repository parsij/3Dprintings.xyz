function normalizeShipments(tracking) {
  if (!tracking || typeof tracking !== "object") return [];
  return Array.isArray(tracking.shipments) ? tracking.shipments : [];
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) return "Timestamp unavailable";
  return date.toLocaleString();
}

function formatStatus(value) {
  const normalized = String(value || "").replaceAll("_", " ").trim();
  if (!normalized) return "Pending";
  if (normalized.toLowerCase() === "pending tracking") return "Pending Shipping";
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatLocation(location) {
  if (!location || typeof location !== "object") return "";
  return [location.city, location.state, location.zip, location.country].filter(Boolean).join(", ");
}

function formatEventMessage(event) {
  const message = String(event?.message || "").trim();
  if (message === "Tracking number pending from seller" || message === "Pending Shipping from seller") {
    return "Pending shipping";
  }
  return message || formatStatus(event?.status);
}

export default function TrackingSection({
  tracking,
  compact = false,
  title = "Tracking",
  showHeader = true,
}) {
  const shipments = normalizeShipments(tracking);
  const hasShipments = shipments.length > 0;

  return (
    <section className={`rounded-lg border border-gray-100 bg-gray-50 ${compact ? "p-3" : "p-4"} space-y-3`}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {tracking?.lastUpdatedAt ? (
            <p className="text-xs text-gray-500">Updated {formatDateTime(tracking.lastUpdatedAt)}</p>
          ) : null}
        </div>
      ) : null}

      {!hasShipments ? (
        <p className="text-sm text-gray-600">No tracking updates yet.</p>
      ) : (
        <div className="space-y-3">
          {shipments.map((shipment, shipmentIndex) => {
            const events = Array.isArray(shipment.events) ? [...shipment.events] : [];
            events.sort((left, right) => {
              const leftTime = left.datetime ? new Date(left.datetime).getTime() : 0;
              const rightTime = right.datetime ? new Date(right.datetime).getTime() : 0;
              return rightTime - leftTime;
            });
            const displayedEvents = compact ? events.slice(0, 2) : events;

            return (
              <div key={`${shipment.trackerId || shipment.sellerId || shipmentIndex}-${shipmentIndex}`} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{formatStatus(shipment.status)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    {shipment.carrier || shipment.service ? (
                      <p className="text-xs text-gray-600">{[shipment.carrier, shipment.service].filter(Boolean).join(" ")}</p>
                    ) : null}
                    {shipment.trackingCode ? (
                      <p className="font-mono text-xs text-gray-900 break-all">{shipment.trackingCode}</p>
                    ) : null}
                  </div>
                </div>

                {displayedEvents.length > 0 ? (
                  <ol className="mt-3 space-y-2">
                    {displayedEvents.map((event, eventIndex) => {
                      const location = formatLocation(event.location);
                      return (
                        <li key={`${event.id || event.datetime || eventIndex}-${eventIndex}`} className="border-l-2 border-orange-200 pl-3">
                          <p className="text-sm font-medium text-gray-900">{formatEventMessage(event)}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(event.datetime)}</p>
                          {location ? <p className="text-xs text-gray-500">{location}</p> : null}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-gray-600">Waiting for carrier updates.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
