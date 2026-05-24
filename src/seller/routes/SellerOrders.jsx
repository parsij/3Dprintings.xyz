import { useCallback, useEffect, useMemo, useState } from "react";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import { getSellerOrders } from "../services/sellerPortalService.js";
import SellerOrdersCard from "../components/SellerOrdersCard.jsx";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function SellerOrders() {
  const [allOrders, setAllOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const reloadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const response = await getSellerOrders("");
      setAllOrders(Array.isArray(response.orders) ? response.orders : []);
    } catch (error) {
      setOrdersError(error?.response?.data?.message || "Failed to load seller orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadOrders();
  }, [reloadOrders]);

  const totals = useMemo(() => {
    return allOrders.reduce(
      (acc, order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        acc.orders += 1;
        acc.items += items.reduce((count, item) => count + (Number(item.quantity) || 0), 0);
        return acc;
      },
      { orders: 0, items: 0 }
    );
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    if (!statusFilter) return allOrders;
    return allOrders.filter(order => order.status === statusFilter);
  }, [allOrders, statusFilter]);

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

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Orders</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.orders}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Number of Sold Items</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.items}</p>
          </div>
        </div>

        {ordersError ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ordersError}</p>
        ) : null}

        {ordersLoading ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Loading seller orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            {statusFilter === "pending" && "No pending orders found."}
            {statusFilter === "completed" && "No completed orders found."}
            {statusFilter === "cancelled" && "No cancelled orders found."}
            {!statusFilter && "No seller orders found."}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <SellerOrdersCard key={order.id} order={order} onTrackingSaved={reloadOrders} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
