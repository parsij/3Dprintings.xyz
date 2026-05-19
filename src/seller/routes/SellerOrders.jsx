import { useCallback, useEffect, useMemo, useState } from "react";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import { getSellerOrders } from "../services/sellerPortalService.js";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const reloadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const response = await getSellerOrders(statusFilter);
      setOrders(Array.isArray(response.orders) ? response.orders : []);
    } catch (error) {
      setOrdersError(error?.response?.data?.message || "Failed to load seller orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    reloadOrders();
  }, [reloadOrders]);

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        acc.orders += 1;
        acc.items += items.reduce((count, item) => count + (Number(item.quantity) || 0), 0);
        acc.subtotal += Number(order.sellerSubtotal) || 0;
        return acc;
      },
      { orders: 0, items: 0, subtotal: 0 }
    );
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <SellerNavBar pageName={"Orders"} />
      <SideMenu role={"seller"} title={"Seller Options"} />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 lg:px-[5vw]">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Seller Orders</h1>
            <p className="mt-1 text-sm text-gray-500">Orders that include products from your inventory.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-gray-950 bg-gray-950 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Orders</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.orders}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Quantity Sold</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.items}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Seller Subtotal</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totals.subtotal)}</p>
          </div>
        </div>

        {ordersError ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ordersError}</p>
        ) : null}

        {ordersLoading ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Loading seller orders...</p>
        ) : orders.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">No seller orders found.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Order ID</p>
                    <h2 className="break-all font-mono text-sm font-semibold text-gray-900">{order.id}</h2>
                    <p className="mt-2 text-sm text-gray-600">
                      {order.customerUsername || "Customer"}
                      {order.customerEmail ? <span className="text-gray-400"> &middot; {order.customerEmail}</span> : null}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusStyles(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
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
                    <p className="text-xs font-semibold uppercase text-gray-500">Your Subtotal</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(order.sellerSubtotal)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
