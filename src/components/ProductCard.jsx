import React from "react";

const ProductCard = ({
  imgSrc,
  imgAlt,
  tagName,
  tagColor,
  creatorInitial,
  creatorName,
  productName,
  rating,
  reviewCount,
  currentPrice,
  originalPrice,
}) => {
  return (
    <div className="bg-neutral-950 rounded-xl shadow-sm shadow-black/40 border border-neutral-800/70 overflow-hidden group hover:border-neutral-700/80 transition-all duration-200 flex flex-col">
      <div className="bg-neutral-900 aspect-square relative overflow-hidden">
        <img
          alt={imgAlt}
          src={imgSrc}
          className="object-cover group-hover:scale-105 transition-transform duration-300 w-full h-full"
        />
        <button
          type="submit"
          className="absolute top-3 right-3 backdrop-blur-sm border border-neutral-700/50 flex hover:bg-black/70 hover:border-neutral-600 transition-all duration-150 group/like w-8 h-8 bg-black/50 rounded-full items-center justify-center"
        >
        </button>
        <div className="absolute top-3 left-3">
          <span
            className={`text-xs font-medium ${tagColor} px-2 py-0.5 rounded-md backdrop-blur-sm border border-neutral-700/50`}
          >
            {tagName}
          </span>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="items-center flex gap-2">
          <img
            alt="creator"
            src={`https://placehold.co/24x24/2a2a2a/aaaaaa?text=${creatorInitial}`}
            className="border border-neutral-700 w-5 h-5 rounded-full"
          />
          <span className="text-xs text-neutral-500">
            by
            <span
              className="text-neutral-400 font-medium hover:text-white transition-colors cursor-pointer"
            >
              {creatorName}
            </span>
          </span>
        </div>
        <div>
          <h3
            className="text-sm font-semibold text-white leading-snug hover:text-neutral-300 transition-colors cursor-pointer line-clamp-2"
          >
            {productName}
          </h3>
        </div>
        <div className="items-center flex gap-1.5">
          <div className="items-center flex gap-0.5">

          </div>
          <span className="text-xs text-neutral-500 tabular-nums">{rating}</span>
          <span className="text-xs text-neutral-600">·</span>
          <span className="text-xs text-neutral-500 tabular-nums">{reviewCount}</span>
        </div>
        <div className="items-center justify-between mt-auto pt-1 flex">
          <div>
            <span className="text-base font-semibold text-white tabular-nums">{currentPrice}</span>
            {originalPrice && (
              <span
                strikethrough=""
                className="text-xs text-neutral-600 ml-1 tabular-nums"
              >
                {originalPrice}
              </span>
            )}
          </div>
          <button
            type="submit"
            className="flex gap-1.5 hover:bg-neutral-200 transition-colors duration-150 items-center bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md"
          >

            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
