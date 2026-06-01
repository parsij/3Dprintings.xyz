import { Link } from "react-router-dom";
import { MARKETPLACE_ORIGIN, isSellerHostname } from "../../config/api.js";
import {
  buildProductImageUrl,
  formatProductPrice,
  getChatImageBase,
} from "../../utils/chatFormatting.js";

function Avatar({ imageUrl, label, size = "md" }) {
  const sizeClass = size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base";

  return (
    <div className={`${sizeClass} shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 ring-1 ring-orange-200/80`}>
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold text-orange-700">
          {String(label || "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function buildMarketplaceProductHref(productId) {
  const parsedProductId = Number(productId);
  if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
    return MARKETPLACE_ORIGIN;
  }

  const path = `/product/${parsedProductId}`;
  if (typeof window !== "undefined" && isSellerHostname(window.location.hostname)) {
    return `${MARKETPLACE_ORIGIN}${path}`;
  }
  return path;
}

function isExternalProductHref(href) {
  return /^https?:\/\//i.test(String(href || ""));
}

function ProductCardContent({ conversation, compact, priceLabel, imageUrl }) {
  return (
    <>
      <div className={`${compact ? "h-14 w-14" : "h-16 w-16"} shrink-0 overflow-hidden rounded-xl bg-gray-100`}>
        {imageUrl ? (
          <img src={imageUrl} alt={conversation.productName || "Product"} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
            No image
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-orange-700">
          {conversation.productName || "Listed model"}
        </p>
        <p className="truncate text-xs text-gray-500">
          {conversation.shopName ? `by ${conversation.shopName}` : "View original listing"}
        </p>
        {priceLabel ? (
          <p className="mt-1 text-sm font-bold text-gray-900">${priceLabel}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs font-semibold text-orange-600 group-hover:text-orange-700">
        View
      </span>
    </>
  );
}

export function ChatProductCard({ conversation, compact = false }) {
  if (!conversation?.productId) {
    return null;
  }

  const imageUrl = buildProductImageUrl(conversation.productImage, getChatImageBase());
  const priceLabel = formatProductPrice(conversation.productPrice);
  const productHref = buildMarketplaceProductHref(conversation.productId);
  const className = `group flex items-center gap-3 rounded-2xl border border-orange-100 bg-white/90 shadow-sm transition hover:border-orange-300 hover:shadow-md ${
    compact ? "p-2.5" : "p-3"
  }`;

  if (isExternalProductHref(productHref)) {
    return (
      <a
        href={productHref}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ProductCardContent
          conversation={conversation}
          compact={compact}
          priceLabel={priceLabel}
          imageUrl={imageUrl}
        />
      </a>
    );
  }

  return (
    <Link to={productHref} className={className}>
      <ProductCardContent
        conversation={conversation}
        compact={compact}
        priceLabel={priceLabel}
        imageUrl={imageUrl}
      />
    </Link>
  );
}

export function ConversationAvatar({ conversation, mode = "customer" }) {
  const isSellerView = mode === "seller";
  const label = isSellerView
    ? conversation?.otherParticipantLabel || "Buyer"
    : conversation?.shopName || conversation?.title || "Shop";

  const imageBase = getChatImageBase();
  let imageUrl = "";

  if (conversation?.contextType === "product" && conversation?.productImage) {
    imageUrl = buildProductImageUrl(conversation.productImage, imageBase);
  } else if (conversation?.contextType === "order") {
    imageUrl = "order-context";
  } else if (!isSellerView && conversation?.shopLogoUrl) {
    imageUrl = conversation.shopLogoUrl;
  }

  if (imageUrl === "order-context") {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-blue-100 ring-1 ring-blue-200/80">
        <span className="flex h-full w-full items-center justify-center text-blue-700">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M12 12 21 7.5M12 12v9M12 12 3 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    );
  }

  return <Avatar imageUrl={imageUrl} label={label} />;
}

export default ChatProductCard;
