import React from "react";
import image_test from "../assets/Screenshot_20260322_175244.png";

const ProductCard = ({
  creatorName,
  productName,
  rating,
  reviewNumber,
  currentPrice,
  originalPrice,
}) => {
  return (
    <div className="flex flex-col rounded-xl bg-white overflow-hidden hover:shadow-xl transition-shadow cursor-pointer text-sm">
      <div className="h-70 overflow-hidden">
        <img
          src={image_test}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      <section className="p-3 flex flex-col gap-1 text-left flex-1">
        <div className="line-clamp-2 min-h-12" title={productName}>
          {productName}
        </div>

        <span className="font-bold">
          {rating} ⭐
        </span>
        <span className="truncate">
          ({reviewNumber}) By {creatorName}
        </span>

        <div>
          <span>${currentPrice}</span>
          {originalPrice && (
            <>
              <span className="line-through ml-2 text-sm">${originalPrice}</span>
              <span className="text-sm">
                {" "}
                ({Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% off)
              </span>
            </>
          )}
        </div>

        <div className="mt-auto pt-3">
          <button
            className="w-full px-4 py-2 rounded-full border border-black text-sm font-medium transition-transform duration-200 hover:scale-105"
          >
            + Add to cart
          </button>
        </div>
      </section>
    </div>
  );
};

export default ProductCard;