import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import image_test from "../assets/Screenshot_20260322_175244.png";
import { addToCart } from "../services/cartService.js";

const ProductCard = ({
  productId,
  creatorName,
  productName,
  rating,
  reviewNumber,
  currentPrice,
  originalPrice,
  imageUrl,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Helper function to format price: remove .00 but keep other decimals like .50
  const formatPrice = (price) => {
    const num = Number(price);
    if (num % 1 === 0) {
      // Whole number, show without decimals
      return num.toString();
    }
    // Has decimals, show with 2 decimal places
    return num.toFixed(2);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation(); // prevent card click
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      console.log('[ProductCard] Adding to cart productId:', productId);
      await addToCart(productId, 1);
      console.log('[ProductCard] Added to cart successfully');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('[ProductCard] Error adding to cart:', err);
      setError(err?.response?.data?.message || "Failed to add to cart");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    if (productId) {
      navigate(`/product/${productId}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex flex-col rounded-xl bg-white overflow-hidden hover:shadow-xl transition-shadow cursor-pointer text-sm"
    >
      <div className="h-70 overflow-hidden bg-gray-200">
        <img
          src={imageUrl || image_test}
          alt={productName}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null; // Prevent infinite loop if fallback also fails
            e.target.src = image_test;
          }}
        />
      </div>

      <section className="p-3 flex flex-col gap-1 text-left flex-1">
        <div className="line-clamp-2 min-h-12 font-medium" title={productName}>
          {productName}
        </div>

        <span className="font-bold text-gray-800">
          {rating ? Number(rating).toFixed(1) : "0.0"} ⭐
        </span>
        <span className="truncate text-gray-500">
          ({reviewNumber || 0}) By {creatorName || 'Unknown'}
        </span>

        <div className="mt-1">
          <span className="font-bold text-lg text-black">${formatPrice(currentPrice)}</span>
          {originalPrice && Number(originalPrice) > Number(currentPrice) && (
            <>
              <span className="line-through ml-2 text-gray-400 text-xs">${formatPrice(originalPrice)}</span>
              <span className="text-green-600 text-xs ml-1 font-semibold">
                {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% off
              </span>
            </>
          )}
        </div>

        {error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-1 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-2 text-xs text-green-600 bg-green-50 p-1 rounded">
            ✓ Added to cart!
          </div>
        )}

        <div className="mt-auto pt-3">
          <button
            onClick={handleAddToCart}
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-full border border-black text-sm font-medium transition-all duration-200 hover:bg-black hover:text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Adding..." : "+ Add to cart"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ProductCard;