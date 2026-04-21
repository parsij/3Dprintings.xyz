import React from "react";
import image_test from "../assets/Screenshot_20260322_175244.png";

const ProductCard = ({
  creatorName,
  productName,
  rating,
  reviewNumber,
  currentPrice,
  originalPrice,
  imageUrl,
}) => {
  return (
    <div className="flex flex-col rounded-xl bg-white overflow-hidden hover:shadow-xl transition-shadow cursor-pointer text-sm">
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
          <span className="font-bold text-lg text-black">${currentPrice}</span>
          {originalPrice && Number(originalPrice) > Number(currentPrice) && (
            <>
              <span className="line-through ml-2 text-gray-400 text-xs">${originalPrice}</span>
              <span className="text-green-600 text-xs ml-1 font-semibold">
                {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% off
              </span>
            </>
          )}
        </div>

        <div className="mt-auto pt-3">
          <button
            className="w-full px-4 py-2 rounded-full border border-black text-sm font-medium transition-all duration-200 hover:bg-black hover:text-white active:scale-95"
          >
            + Add to cart
          </button>
        </div>
      </section>
    </div>
  );
};

export default ProductCard;
