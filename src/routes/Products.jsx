import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard.jsx";
import Navbar from "../components/NavBar.jsx";
import Seo from "../components/Seo.jsx";
import { API_BASE } from "../config/api.js";

const sortOptions = [
  { value: "relevant", label: "Most Relevant" },
  { value: "price_asc", label: "Price: Low To High" },
  { value: "price_desc", label: "Price: High To Low" },
  { value: "sales", label: "Best Selling" },
];

function getCardProps(product) {
  return {
    productId: product.id,
    creatorName: product.creator_name,
    productName: product.name,
    rating: product.rating,
    currentPrice: product.current_price,
    originalPrice: product.original_price,
    reviewNumber: product.reviews_count || 0,
    imageUrl: product.image_url,
    sellerId: product.seller_id || product.user_id,
    shopName: product.shop_name,
    shopLogoUrl: product.shop_logo_url,
    quantity: product.quantity,
  };
}

const Products = ({
  user,
  NoNavBarLimit,
  embedded = false,
  title = "Shop 3D Prints & Files",
  eyebrow = "Marketplace",
  description = "Browse physical 3D printed goods, replacement parts, display pieces, and downloadable files listed by independent makers.",
}) => {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("relevant");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef(null);

  const lastProductElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await axios.get(`${API_BASE}/api/products`, {
        params: { page, limit: 12, sort },
      });
      const data = response.data;

      setProducts((prev) => {
        const existingIds = new Set(prev.map((product) => product.id));
        const newProducts = (data.products || []).filter(
          (product) => !existingIds.has(product.id)
        );
        return [...prev, ...newProducts];
      });
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      setLoadError(error?.response?.data?.message || "Products Could Not Load. Try Refreshing The Page.");
    } finally {
      setLoading(false);
    }
  }, [page, sort]);

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
  }, [sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  const ContentTag = embedded ? "div" : "main";
  const HeadingTag = embedded ? "h2" : "h1";

  const content = (
    <ContentTag id={embedded ? undefined : "main-content"} className={`${embedded ? "" : "px-4 pb-16 pt-28 sm:px-6 lg:px-[5vw]"}`}>
      <section className={`${embedded ? "" : "mx-auto max-w-7xl"}`} aria-labelledby="products-heading">
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-orange-100/80 bg-white/82 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)] backdrop-blur sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">{eyebrow}</p>
              <HeadingTag id="products-heading" className="mt-3 text-balance font-display text-3xl font-black tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
                {title}
              </HeadingTag>
              <p className="mt-4 max-w-2xl text-pretty text-base font-semibold leading-7 text-gray-600">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-900">
                {products.length > 0 ? `${products.length} Loaded` : "Fresh Listings"}
              </div>
              <label className="sr-only" htmlFor={embedded ? "home-product-sort" : "product-sort"}>
                Sort Products
              </label>
              <div className="relative">
                <select
                  id={embedded ? "home-product-sort" : "product-sort"}
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="focus-ring appearance-none rounded-2xl border border-orange-200 bg-white px-4 py-3 pr-11 text-sm font-black text-gray-800 shadow-sm transition-colors duration-200 hover:border-orange-400"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-current text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5.293 7.293a1 1 0 0 1 1.414 0L10 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {loadError && (
          <div role="status" aria-live="polite" className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-live="polite">
          {products.map((product, index) => {
            const isLastElement = products.length === index + 1;
            const card = <ProductCard {...getCardProps(product)} />;

            return isLastElement ? (
              <div ref={lastProductElementRef} key={product.id} className="animate-fade-in-up">
                {card}
              </div>
            ) : (
              <div key={product.id} className="animate-fade-in-up">
                {card}
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent" />
            <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-gray-500">Loading Listings…</p>
          </div>
        )}

        {!loading && products.length === 0 && !loadError && (
          <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white/70 px-6 py-16 text-center">
            <h2 className="font-display text-2xl font-black text-gray-950">No Listings Yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-gray-600">
              Listings will appear here as sellers publish physical prints and downloadable files.
            </p>
          </div>
        )}

        {!hasMore && products.length > 0 && (
          <div className="py-12 text-center text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            End Of Current Listings
          </div>
        )}
      </section>
    </ContentTag>
  );

  if (embedded) return content;

  return (
    <div className="site-shell min-h-screen">
      <Seo
        title="Shop 3D Prints & Model Files"
        description="Browse physical 3D printed products and downloadable files from independent creators on 3Dprintings.xyz."
        path="/products"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "3D Printed Products And Files",
          description,
          url: "https://3dprintings.xyz/products",
        }}
      />
      <Navbar isSignedIn={Boolean(user)} NoNavBarLimit={NoNavBarLimit} />
      {content}
    </div>
  );
};

export default Products;
