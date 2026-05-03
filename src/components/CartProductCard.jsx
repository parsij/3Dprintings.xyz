import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import trash from "../assets/trash.svg";
import image_test from "../assets/Screenshot_20260322_175244.png";

const CartProductCard = ({
  productId,
  creatorName,
  productName,
  rating,
  reviewNumber,
  currentPrice,
  originalPrice,
  imageUrl,
  onIncrease,
  onDecrease,
  onRemove,
  quantity,
  onQuantityChange,
}) => {
  const [inputValue, setInputValue] = useState(String(quantity));

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

  // Sync input value when quantity prop changes
  useEffect(() => {
    setInputValue(String(quantity));
  }, [quantity]);

  const hasDiscount =
    originalPrice != null && Number(originalPrice) > Number(currentPrice);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val); // Allow empty input while typing
  };

  const handleInputBlur = () => {
    const num = parseInt(inputValue, 10);
    if (Number.isNaN(num) || num < 1) {
      // Invalid input, reset to current quantity
      setInputValue(String(quantity));
    } else if (num !== quantity && onQuantityChange) {
      // Valid input and different from current, update parent
      onQuantityChange(num);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  return (
    <div className="w-full rounded-2xl border-2 border-black/10 bg-[#F6F1EA] p-4">
      <div className="flex gap-4">
        {/* Image */}
        <Link
          to={`/product/${productId}`}
          className="h-34 w-20 sm:h-35 sm:w-35 shrink-0 overflow-hidden rounded-xl bg-white/60 md:h-40 md:w-40 lg:h-45 lg:w-45 block hover:opacity-80 transition"
        >
          <img
            src={imageUrl || image_test}
            alt={productName}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = image_test;
            }}
          />
        </Link>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/product/${productId}`}
                className="hover:underline hover:text-orange-500 transition"
              >
                <div
                  className="truncate text-[15px] font-semibold text-black mt-2"
                  title={productName}
                >
                  {productName}
                </div>
              </Link>
              {/* You can put product title, subtitle, etc. here if needed */}
            </div>

            {/* Remove (trash) icon */}
            <button
              type="button"
              onClick={onRemove}
              className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50"
              aria-label="Remove item"
              title="Remove"
            >
              <img
                src={trash}
                alt="Delete"
                className="w-7 h-7 sm:h-8 sm:w-8 md:w-9 md:h-9 object-contain block cursor-pointer hover:bg-gray-200 rounded-xl"
              />
            </button>
          </div>

          {/* Bottom row: price left, stepper right */}
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <div className="text-lg font-semibold text-black">
                {"$"}
                {formatPrice(Number(currentPrice) * quantity)}
              </div>

              <div className="text-xs text-gray-500">
                {"$"}
                {formatPrice(currentPrice)} x {quantity} = {"$"}
                {formatPrice(Number(currentPrice) * quantity)}
              </div>

              {hasDiscount && (
                <div className="text-xs text-black/50">
                  <span className="line-through">
                    {"$"}
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="ml-2 text-green-700 font-semibold">
                    {Math.round(
                      ((Number(originalPrice) - Number(currentPrice)) /
                        Number(originalPrice)) *
                        100
                    )}
                    % off
                  </span>
                </div>
              )}

              {/* Optional small line (your old "By creator") */}
              {creatorName ? (
                <div className="mt-1 text-xs text-black/60">
                  By {creatorName}
                </div>
              ) : null}
            </div>

            {/* Quantity stepper */}
            <div className="flex items-center rounded-full bg-white/70 px-3 py-2 shadow-sm">
              <button
                type="button"
                onClick={onDecrease}
                className="h-7 w-7 rounded-full text-black/80 cursor-pointer hover:bg-black/5 disabled:opacity-40"
                disabled={!onDecrease}
                aria-label="Decrease quantity"
              >
                -
              </button>

              <input
                className="w-12 text-center text-sm font-medium text-black rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                value={inputValue}
                type="text"
                min={1}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
              />

              <button
                type="button"
                onClick={onIncrease}
                className="h-7 w-7 rounded-full cursor-pointer text-black/80 hover:bg-black/5 disabled:opacity-40"
                disabled={!onIncrease}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Optional rating line (if you still want it) */}
          {rating != null ? (
            <div className="mt-2 text-xs text-black/60">
              {Number(rating).toFixed(1)} ⭐{" "}
              {reviewNumber ? `(${reviewNumber})` : ""}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CartProductCard;

