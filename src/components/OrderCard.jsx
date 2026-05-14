const OrderCard = ({
  orderId,
  status = "pending",
  createdAt,
  paymentMethod = "Not available",
  totalAmount = 0,
  totalItemsCount = 0,
  onViewDetails,
  isDetailsLoading = false,
}) => {
  const statusMap = {
    completed: { label: "Completed", styles: "bg-green-50 text-green-600" },
    pending: { label: "Waiting for Payment", styles: "bg-amber-50 text-amber-600" },
    cancelled: { label: "Cancelled", styles: "bg-red-50 text-red-600" },
  };

  const normalizedStatus = String(status || "").toLowerCase();
  const currentStatus = statusMap[normalizedStatus] || {
    label: normalizedStatus ? normalizedStatus[0].toUpperCase() + normalizedStatus.slice(1) : "Unknown",
    styles: "bg-gray-50 text-gray-600",
  };

  const safeTotal = Number.isFinite(Number(totalAmount)) ? Number(totalAmount) : 0;
  const safeItemsCount = Number.isFinite(Number(totalItemsCount)) ? Number(totalItemsCount) : 0;
  const orderDate = createdAt ? new Date(createdAt) : null;
  const formattedDate =
    orderDate && !Number.isNaN(orderDate.valueOf())
      ? orderDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : "Unknown date";

  const formattedTotal = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(safeTotal);

  return (
    <article className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden w-full">
      <div className="p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-gray-400 text-xs">Order ID</p>
            <h3 className="font-mono text-sm sm:text-base font-semibold text-gray-900 break-all">{orderId}</h3>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${currentStatus.styles}`}>
              {currentStatus.label}
            </span>
            <p className="text-xs text-gray-500">
              Ordered on <span className="text-gray-700 font-medium">{formattedDate}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Payment</p>
            <p className="font-medium text-gray-800 break-words">{paymentMethod}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Items</p>
            <p className="font-medium text-gray-800">{safeItemsCount}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-semibold text-gray-900">{formattedTotal}</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-5 py-3 bg-gray-50/40 border-t border-gray-100 flex justify-end">
        <button
          type="button"
          onClick={onViewDetails}
          disabled={isDetailsLoading}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-800 hover:scale-105 active:scale-95 transition duration-100 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isDetailsLoading ? "Loading..." : "Details"}
        </button>
      </div>
    </article>
  );
};

export default OrderCard;
