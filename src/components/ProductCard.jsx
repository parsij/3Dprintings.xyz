import { useState } from "react";
import { Link } from "react-router-dom";
import image_test from "../assets/product-placeholder.webp";
import { addToCart } from "../services/cartService.js";
import { shopPath } from "../utils/shopName.js";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatPrice(price) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "Price unavailable";

  return currencyFormatter.format(amount).replace(/\.00$/, "");
}

function getDiscountPercent(originalPrice, currentPrice) {
  const original = Number(originalPrice);
  const current = Number(currentPrice);
  if (!Number.isFinite(original) || !Number.isFinite(current) || original <= current) return 0;

  return Math.round(((original - current) / original) * 100);
}

const ProductCard = ({
  productId,
  creatorName,
  productName,
  rating,
  reviewNumber,
  currentPrice,
  originalPrice,
  imageUrl,
  shopName,
  shopLogoUrl,
  quantity,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const displayName = productName || "Untitled 3D print";
  const displayShopName = shopName || creatorName || "Independent maker";
  const productUrl = productId ? `/product/${productId}` : "/products";
  const sellerUrl = shopPath(shopName);
  const discountPercent = getDiscountPercent(originalPrice, currentPrice);
  const stockCount = quantity === undefined || quantity === null ? null : Number(quantity);
  const isSoldOut = Number.isFinite(stockCount) && stockCount <= 0;
  const isLowStock = Number.isFinite(stockCount) && stockCount > 0 && stockCount <= 2;

  const handleAddToCart = async () => {
    if (isLoading || success || isSoldOut || !productId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await addToCart(productId, 1);
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 1400);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not add to cart. Try again.");
      window.setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-emerald-950/15 bg-white shadow-[0_14px_42px_rgba(6,78,59,0.1)] transition-[box-shadow,border-color] duration-150 hover:border-red-500/35 hover:shadow-[0_20px_56px_rgba(6,78,59,0.16)]">
      <Link to={productUrl} className="focus-ring block" aria-label={`View ${displayName}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-emerald-50">
          <img
            src={imageUrl || image_test}
            alt={displayName}
            width="640"
            height="480"
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = image_test;
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-emerald-950/35 via-transparent to-transparent opacity-80" />
          {discountPercent > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow-lg">
              {discountPercent}% off
            </span>
          )}
          {isLowStock && (
            <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-3 py-1 text-xs font-black text-red-700 shadow-lg">
              Only {stockCount} left
            </span>
          )}
          {isSoldOut && (
            <span className="absolute bottom-3 left-3 rounded-full bg-emerald-950 px-3 py-1 text-xs font-black text-white shadow-lg">
              Sold out
            </span>
          )}
        </div>
      </Link>

      <section className="flex flex-1 flex-col gap-3 p-4 text-left sm:p-5">
        <div className="min-w-0">
          <Link to={productUrl} className="focus-ring rounded-xl">
            <h3 className="line-clamp-2 min-h-[3rem] text-pretty font-display text-base font-black leading-6 text-emerald-950 transition-colors duration-150 group-hover:text-red-700">
              {displayName}
            </h3>
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3">
          {sellerUrl ? (
            <Link
              to={sellerUrl}
              className="focus-ring flex min-w-0 items-center gap-2 rounded-2xl text-sm font-bold text-stone-600 transition-colors duration-150 hover:text-red-700"
              aria-label={`Visit ${displayShopName}`}
            >
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-emerald-100">
                {shopLogoUrl ? (
                  <img
                    src={shopLogoUrl}
                    alt=""
                    width="64"
                    height="64"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-emerald-100 text-xs font-black text-emerald-900">
                    {displayShopName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0 truncate">{displayShopName}</span>
            </Link>
          ) : (
            <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-stone-600">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-900">
                {displayShopName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 truncate">{displayShopName}</span>
            </div>
          )}

          <div className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700" aria-label={`${Number(rating || 0).toFixed(1)} stars from ${reviewNumber || 0} reviews`}>
            {Number(rating || 0).toFixed(1)} stars
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-2xl font-black text-emerald-950 tabular-nums">
                {formatPrice(currentPrice)}
              </span>
              {discountPercent > 0 && (
                <span className="text-sm font-bold text-stone-400 line-through tabular-nums">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-bold text-stone-500">Printed item, model file, or maker bundle</p>
          </div>
        </div>

        {error && (
          <div role="status" aria-live="polite" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isLoading || success || isSoldOut}
          className={`focus-ring relative w-full overflow-hidden rounded-2xl px-4 py-3 text-sm font-black transition-[background-color,color,opacity] duration-150 disabled:cursor-not-allowed ${
            success
              ? "bg-emerald-600 text-white"
              : isSoldOut
                ? "bg-stone-200 text-stone-500"
                : "bg-emerald-950 text-white hover:bg-red-600"
          } ${isLoading ? "opacity-75" : ""}`}
        >
          <span className={success ? "opacity-0" : "opacity-100"}>
            {isSoldOut ? "Sold out" : isLoading ? "Adding..." : "Add to cart"}
          </span>
          <span className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${success ? "opacity-100" : "opacity-0"}`}>
            Added
          </span>
        </button>
      </section>
    </article>
  );
};

export default ProductCard;
