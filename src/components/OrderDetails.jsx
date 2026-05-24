import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import TrackingSection from "./TrackingSection.jsx";

function getOrderItemsArray(itemsPayload) {
  if (Array.isArray(itemsPayload)) return itemsPayload;
  if (itemsPayload && typeof itemsPayload === "object" && Array.isArray(itemsPayload.items)) {
    return itemsPayload.items;
  }
  return [];
}

function toMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "$0.00";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(numeric);
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

export default function OrderDetails({ user }) {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    if (!user || !orderId) return;
    const controller = new AbortController();

    const loadOrder = async () => {
      setLoading(true);
      setError("");
      setOrder(null);

      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
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

        if (response.status === 401) {
          navigate("/signin", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || "Failed to load order.");
        }
        // this is not an error

        setOrder(payload);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load order.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadOrder();
    return () => controller.abort();
  }, [navigate, orderId, user]);

  const handlePayment = async () => {
    if (!order || !order.id) return;
    setPaymentLoading(true);
    setPaymentError("");

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/pay`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (response.status === 401) {
        navigate("/signin", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Failed to process payment.");
      }

      // Redirect to Stripe checkout URL if provided
      if (payload.checkout_url) {
        window.location.href = payload.checkout_url;
      } else {
        // Reload order to reflect status change
        window.location.reload();
      }
    } catch (err) {
      setPaymentError(err.message || "Failed to process payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const items = useMemo(() => getOrderItemsArray(order?.items), [order?.items]);
  const orderTotals = order?.items && typeof order.items === "object" && !Array.isArray(order.items)
    ? order.items
    : null;

  const isPending = order && String(order.status || "").toLowerCase() === "pending";

  if (!user) return <Navigate to="/signin" replace />;

  return (
    <section className="space-y-4 animate-fade-in-up transition-all duration-300">
      <div className="flex items-center justify-between gap-3">
        <nav className="text-[1.67rem] font-extrabold">
          Order <span className="text-orange-500">Details</span>
        </nav>
        <Link
          to="/account/orders"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200 hover:scale-105 transition-transform transform-gpu backface-hidden"
        >
          Back to Orders
        </Link>
      </div>

      {loading ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Loading order...</p>
      ) : error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : !order ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Order not found.</p>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-xs text-gray-500">Order ID</p>
            <p className="font-mono text-sm break-all text-gray-900">{order.id}</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Status</p>
                <p className="font-semibold capitalize text-gray-900">{order.status || "unknown"}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Payment</p>
                <p className="font-semibold text-gray-900">{normalizePaymentType(order.payment_type)}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-semibold text-gray-900">{toMoney(order.total_amount)}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Order Date</p>
                <p className="font-semibold text-gray-900">
                  {order.created_at ? new Date(order.created_at).toLocaleString() : "Unknown"}
                </p>
              </div>
            </div>

            {isPending && paymentError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{paymentError}</p>
            )}

            {isPending && (
              <button
                type="button"
                onClick={handlePayment}
                disabled={paymentLoading}
                className="w-full bg-orange-500 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-orange-600 hover:scale-105 active:scale-95 transition duration-100 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {paymentLoading ? "Processing Payment..." : "Pay Now"}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-gray-900">Items</p>
            {items.length === 0 ? (
              <p className="text-sm text-gray-600">No items found for this order.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const quantity = Number(item?.quantity);
                  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
                  const unitPrice = Number(item?.current_price);
                  const safePrice = Number.isFinite(unitPrice) ? unitPrice : 0;
                  const productId = item?.id ?? item?.product_id;
                  const hasProductLink = Number.isFinite(Number(productId)) && Number(productId) > 0;
                  const productPath = hasProductLink ? `/product/${encodeURIComponent(String(productId))}` : null;
                  const productName = item?.name || "Item";
                  const imageUrl = typeof item?.image_url === "string" ? item.image_url : "";
                  return (
                    <div key={`${item?.id || item?.name || "item"}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {imageUrl ? (
                            hasProductLink ? (
                              <Link to={productPath} className="block shrink-0">
                                <img
                                  src={imageUrl}
                                  alt={productName}
                                  className="h-14 w-14 rounded-md object-cover border border-gray-200 hover:scale-115 transition-transform transform-gpu backface-hidden"
                                  loading="lazy"
                                />
                              </Link>
                            ) : (
                              <img
                                src={imageUrl}
                                alt={productName}
                                className="h-14 w-14 rounded-md object-cover border border-gray-200 shrink-0 hover:scale-115 transition-transform transform-gpu backface-hidden"
                                loading="lazy"
                              />
                            )
                          ) : null}

                          <div className="min-w-0">
                            {hasProductLink ? (
                              <Link to={productPath} className="font-medium text-gray-900 hover:text-orange-600 transition-colors duration-250">
                                {productName}
                              </Link>
                            ) : (
                              <p className="font-medium text-gray-900">{productName}</p>
                            )}
                            <p className="text-xs text-gray-600 mt-1">
                              Quantity: {safeQuantity} x {toMoney(safePrice)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 shrink-0">{toMoney(safePrice * safeQuantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <TrackingSection tracking={order.tracking} />

          {orderTotals && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{toMoney(orderTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium text-gray-900">{toMoney(orderTotals.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">{toMoney(orderTotals.shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-700 font-semibold">Total</span>
                <span className="text-gray-900 font-semibold">{toMoney(orderTotals.total ?? order.total_amount)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
