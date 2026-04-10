import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";

export default function CartPage() {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Articulated Otter STL",
      creator: "Parsa",
      price: 12.99,
      oldPrice: 19.99,
      qty: 1,
      image:
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
    },
    {
      id: 2,
      name: "Flexi Dragon 3MF",
      creator: "HowlPrints",
      price: 8.5,
      oldPrice: null,
      qty: 2,
      image:
        "https://images.unsplash.com/photo-1616628182509-6f4f36f56c6f?q=80&w=1200&auto=format&fit=crop",
    },
  ]);

  const updateQty = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, qty: Math.max(1, item.qty + delta) }
            : item
        )
        .filter(Boolean)
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cartItems]
  );

  const shipping = subtotal > 0 ? 4.99 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
      <>
          <SmallNavBar />
        <SideMenu />
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8 my-8">
        <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Your <span className="text-orange-500">Cart</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Review your items before checkout.
          </p>
        </div>

        {cartItems.length === 0 ? (
          <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-8 text-center">
            <p className="text-lg font-semibold">Your cart is empty.</p>
            <p className="mt-2 text-sm text-gray-400">
              Add some awesome 3D models to get started.
            </p>
            <Link
              to="/home"
              className="inline-block mt-5 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400"
            >
              Browse products
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: cart items */}
            <section className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 sm:p-5"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl object-cover border border-gray-800"
                    />

                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-base sm:text-lg line-clamp-2">
                        {item.name}
                      </h2>
                      <p className="text-sm text-gray-400 mt-1">
                        By {item.creator}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center rounded-full border border-gray-700 overflow-hidden">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="cursor-pointer px-3 py-1.5 text-lg hover:bg-gray-800 transition"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="px-4 text-sm font-semibold">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="cursor-pointer px-3 py-1.5 text-lg hover:bg-gray-800 transition"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="cursor-pointer text-sm text-red-400 hover:text-red-300 transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">
                        ${(item.price * item.qty).toFixed(2)}
                      </p>
                      {item.oldPrice && (
                        <p className="text-sm text-gray-500 line-through">
                          ${(item.oldPrice * item.qty).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>

            {/* Right: summary */}
            <aside className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 h-fit lg:sticky lg:top-24">
              <h3 className="text-xl font-bold">Order Summary</h3>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Tax</span>
                  <span>~${tax.toFixed(2)}</span>
                </div>
                <div className="my-3 border-t border-gray-800" />
                <div className="flex items-center justify-between font-extrabold text-base">
                  <span>Total</span>
                  <span className="text-orange-500">${total.toFixed(2)}</span>
                </div>
              </div>

              <button className="cursor-pointer mt-5 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-400 active:scale-[0.99]">
                Proceed to Checkout
              </button>

              <Link
                to="/products"
                className="mt-3 inline-block w-full text-center rounded-xl border border-gray-700 py-3 text-sm font-medium text-gray-200 transition hover:border-orange-500 hover:text-orange-400"
              >
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
          </>
  );
}