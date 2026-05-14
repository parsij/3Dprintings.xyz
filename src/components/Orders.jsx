import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import OrderCard from "./OrderCard.jsx";

const PAGE_SIZE = 10;

function getErrorMessage(response, payload) {
  if (payload && typeof payload.error === "string") return payload.error;
  if (payload && typeof payload.message === "string") return payload.message;
  if (response.status === 401) return "Please sign in to view your orders.";
  return "Failed to load orders.";
}

function getOrderItemsArray(itemsPayload) {
  if (Array.isArray(itemsPayload)) return itemsPayload;
  if (itemsPayload && typeof itemsPayload === "object" && Array.isArray(itemsPayload.items)) {
    return itemsPayload.items;
  }
  return [];
}

function getOrderItemsCount(itemsPayload) {
  const items = getOrderItemsArray(itemsPayload);
  return items.reduce((count, item) => {
    const quantity = Number(item?.quantity);
    if (Number.isFinite(quantity) && quantity > 0) return count + quantity;
    return count + 1;
  }, 0);
}

function normalizePaymentType(paymentType) {
  if (!paymentType || typeof paymentType !== "string") return "Not available";
  return paymentType
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function Orders({ user }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  const sentinelRef = useRef(null);
  const nextPageRef = useRef(1);
  const listRequestInFlightRef = useRef(false);
  const listAbortRef = useRef(null);

  const loadOrdersPage = useCallback(
    async (pageToLoad, { replace = false } = {}) => {
      if (!user || listRequestInFlightRef.current) return;
      listRequestInFlightRef.current = true;

      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError("");

      const controller = new AbortController();
      listAbortRef.current = controller;

      try {
        const query = new URLSearchParams({
          page: String(pageToLoad),
          limit: String(PAGE_SIZE),
        });
        const response = await fetch(`/api/orders?${query.toString()}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(response, payload));
        }

        const incomingOrders = Array.isArray(payload?.orders) ? payload.orders : [];
        const resolvedHasMore = typeof payload?.hasMore === "boolean" ? payload.hasMore : incomingOrders.length === PAGE_SIZE;

        setOrders((previousOrders) => {
          const base = replace ? [] : previousOrders;
          const seen = new Set(base.map((order) => order.id));
          const merged = [...base];

          for (const order of incomingOrders) {
            if (!order?.id || seen.has(order.id)) continue;
            seen.add(order.id);
            merged.push(order);
          }

          return merged;
        });
        setHasMore(resolvedHasMore);
        nextPageRef.current = pageToLoad + 1;
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load orders.");
        }
      } finally {
        if (listAbortRef.current === controller) {
          listAbortRef.current = null;
        }
        listRequestInFlightRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;

    nextPageRef.current = 1;
    setOrders([]);
    setHasMore(true);
    loadOrdersPage(1, { replace: true });

    return () => {
      if (listAbortRef.current) {
        listAbortRef.current.abort();
      }
    };
  }, [user, loadOrdersPage]);

  const loadMoreOrders = useCallback(() => {
    if (!user || !hasMore || loading || loadingMore) return;
    loadOrdersPage(nextPageRef.current, { replace: false });
  }, [hasMore, loadOrdersPage, loading, loadingMore, user]);

  useEffect(() => {
    if (!user || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreOrders();
        }
      },
      { rootMargin: "220px 0px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMoreOrders, user]);

  if (!user) return <Navigate to="/signin" replace />;

  return (
    <section className="space-y-4 animate-fade-in-up transition-all duration-300">
      <nav className="text-[1.67rem] mb-2 font-extrabold">
        Your <span className="text-orange-500">Orders</span>
      </nav>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">No orders found.</p>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              orderId={order.id}
              status={order.status}
              createdAt={order.created_at}
              paymentMethod={normalizePaymentType(order.payment_type)}
              totalAmount={order.total_amount}
              totalItemsCount={getOrderItemsCount(order.items)}
              onViewDetails={() => navigate(`/account/orders/${encodeURIComponent(order.id)}`)}
              isDetailsLoading={false}
            />
          ))}

          {loadingMore && <p className="py-2 text-center text-sm text-gray-600">Loading more orders...</p>}
          {!hasMore && <p className="py-2 text-center text-sm text-gray-500">You reached the end of your orders.</p>}
          <div ref={sentinelRef} className="h-1 w-full" />
        </div>
      )}
    </section>
  );
}
