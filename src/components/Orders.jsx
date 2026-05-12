import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import OrderCard from "./OrderCard.jsx";

export default function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!user) return;

    let isCancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders`, { credentials: "include" });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || res.statusText);
        }
        const data = await res.json();
        if (isCancelled) return;
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (err) {
        if (isCancelled) return;
        setError(err.message || "Failed to load orders.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  if (!user) return <Navigate to="/signin" replace />;

  async function viewOrder(orderId) {
    setSelectedOrder(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || res.statusText);
      }
      const data = await res.json();
      setSelectedOrder(data);
    } catch (err) {
      setError(err.message || "Failed to load order details.");
    }
  }

  return (
      <OrderCard orderNumber={"12ini-123j1-123123-121"} status={"Complete"} date={"1/1/2027"} paymentMethod={"Visa"} total={"320.43"}/>
    // <div className="space-y-6">
    //   <div className="flex items-center justify-between">
    //     <h1 className="text-3xl font-extrabold">Your Orders</h1>
    //   </div>
    //
    //   <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
    //     <div className="lg:col-span-2 space-y-4">
    //       <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow">
    //         {loading ? (
    //           <p>Loading orders…</p>
    //         ) : error ? (
    //           <p className="text-red-600">{error}</p>
    //         ) : orders.length === 0 ? (
    //           <p>No orders found.</p>
    //         ) : (
    //           <ul className="space-y-3">
    //             {orders.map((o) => (
    //               <li key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
    //                 <div>
    //                   <div className="text-xs text-gray-500 uppercase font-semibold">Order ID</div>
    //                   <div className="font-mono text-sm break-all">{o.id}</div>
    //                   <div className="text-xs text-gray-400 mt-1">{new Date(o.created_at).toLocaleString()}</div>
    //                   {o.payment_type && (
    //                     <div className="text-xs text-orange-500 mt-1 font-medium bg-orange-50 px-2 py-0.5 rounded-full inline-block">
    //                       {o.payment_type}
    //                     </div>
    //                   )}
    //                 </div>
    //                 <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
    //                   <div className="text-right">
    //                     <div className="font-bold text-lg text-gray-800">${Number(o.total_amount).toFixed(2)}</div>
    //                     <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
    //                       o.status === 'completed' ? 'bg-green-100 text-green-700' :
    //                       o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
    //                       o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
    //                       'bg-gray-100 text-gray-700'
    //                     }`}>
    //                       {o.status.toUpperCase()}
    //                     </div>
    //                   </div>
    //                   <button
    //                     onClick={() => viewOrder(o.id)}
    //                     className="inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 shadow-sm transition-all active:scale-95"
    //                   >
    //                     Details
    //                   </button>
    //                 </div>
    //               </li>
    //             ))}
    //           </ul>
    //         )}
    //       </div>
    //     </div>
    //
    //     <aside className="space-y-4">
    //       <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow sticky top-24">
    //         <h3 className="font-bold text-lg mb-4 text-gray-800 border-b border-orange-50 pb-2">Order Details</h3>
    //         {!selectedOrder ? (
    //           <div className="text-center py-8">
    //             <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    //             </svg>
    //             <p className="mt-2 text-sm text-gray-500">Select an order to view full details.</p>
    //           </div>
    //         ) : (
    //           <div className="space-y-4 text-sm">
    //             <div>
    //               <div className="text-xs text-gray-400 font-bold uppercase">Order Information</div>
    //               <div className="font-mono text-xs mt-1 bg-gray-50 p-2 rounded break-all">{selectedOrder.id}</div>
    //             </div>
    //             <div className="grid grid-cols-2 gap-4">
    //               <div>
    //                 <div className="text-xs text-gray-400 font-bold uppercase">Status</div>
    //                 <div className="capitalize font-medium text-gray-700">{selectedOrder.status}</div>
    //               </div>
    //               <div>
    //                 <div className="text-xs text-gray-400 font-bold uppercase">Total</div>
    //                 <div className="font-bold text-orange-600 text-base">${Number(selectedOrder.total_amount).toFixed(2)}</div>
    //               </div>
    //             </div>
    //             {selectedOrder.payment_type && (
    //               <div>
    //                 <div className="text-xs text-gray-400 font-bold uppercase">Payment Method</div>
    //                 <div className="capitalize font-medium text-gray-700">{selectedOrder.payment_type}</div>
    //               </div>
    //             )}
    //             <div>
    //               <div className="text-xs text-gray-400 font-bold uppercase mb-2">Items JSON</div>
    //               <pre className="whitespace-pre-wrap rounded-lg bg-gray-900 text-gray-300 p-4 text-[10px] overflow-auto max-h-64 leading-tight">
    //                 {JSON.stringify(selectedOrder.items, null, 2)}
    //               </pre>
    //             </div>
    //           </div>
    //         )}
    //       </div>
    //     </aside>
    //   </div>
    // </div>
  );
}

