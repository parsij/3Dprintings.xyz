import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import CartProductCard from "../components/CartProductCard.jsx";
import {
  getCart,
  updateCartQuantity,
  removeFromCart,
} from "../services/cartService.js";

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load cart on mount
  useEffect(() => {
    async function loadCart() {
      setLoading(true);
      setError(null);
      try {
        const items = await getCart();
        setCartItems(items);
      } catch (err) {
        console.error("Error loading cart:", err);
        setError("Failed to load cart. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadCart();
  }, []);

  // Handle quantity change (when user types in input or clicks +/-)
  const handleQuantityChange = async (productId, newQuantity) => {
    // Validate quantity
    const qty = Math.max(1, Number(newQuantity));

    // Optimistically update UI
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: qty } : item
      )
    );

    // Send update to API
    try {
      await updateCartQuantity(productId, qty);
    } catch (err) {
      console.error("Error updating quantity:", err);
      setError("Failed to update quantity.");
      // Reload cart on error
      const items = await getCart();
      setCartItems(items);
    }
  };

  // Handle product deletion
  const handleRemoveItem = async (productId) => {
    // Optimistically remove from UI
    setCartItems((prev) => prev.filter((item) => item.id !== productId));

    // Send delete to API
    try {
      await removeFromCart(productId);
    } catch (err) {
      console.error("Error removing item:", err);
      setError("Failed to remove item. Please try again.");
      // Reload cart on error
      const items = await getCart();
      setCartItems(items);
    }
  };

  return (
      <>
          <SmallNavBar />
        <SideMenu />
    <main className="min-h-screen bg-orange-50 text-gray-900 px-4 py-8 my-8">
        <div className="mx-auto max-w-7xl animate-fade-in-up">
        <div className="mb-6 group">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight transition-all duration-300 group-hover:translate-x-2">
            Your <span className="text-orange-500 group-hover:text-orange-600 transition-colors duration-300">Cart</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
            Review your items before checkout.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-400 p-4 text-red-700 animate-pulse shadow-lg transition-all duration-300 hover:shadow-xl">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-lg font-semibold text-gray-600 animate-pulse">Loading your cart...</p>
          </div>
        )}

        {cartItems.length === 0 ? (
          <section className="rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-fade-in-up">
            <p className="text-lg font-semibold animate-bounce">Your cart is empty.</p>
            <p className="mt-2 text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
              Add some awesome 3D printed models to get started.
            </p>
            <Link
              to="/home"
              className="inline-block mt-5 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition-all duration-300 hover:bg-orange-400 hover:scale-105 active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
            >
              Browse products
            </Link>
          </section>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item, index) => (
              <div key={item.id} style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}>
                <CartProductCard
                  productId={item.id}
                  productName={item.name}
                  creatorName={item.creator_name}
                  currentPrice={item.current_price}
                  originalPrice={item.original_price}
                  rating={item.rating}
                  reviewNumber={item.reviews_count}
                  imageUrl={item.image_url}
                  quantity={item.quantity}
                  onIncrease={() => handleQuantityChange(item.id, item.quantity + 1)}
                  onDecrease={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                  onQuantityChange={(newQty) => handleQuantityChange(item.id, newQty)}
                  onRemove={() => handleRemoveItem(item.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
          </>
  );
}