import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

const SearchResults = ({ user }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("relevant");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const debounceTimer = useRef(null);
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

  useEffect(() => {
    setSearchInput(query);
    setProducts([]);
    setPage(1);
    setHasMore(true);
    setLoadError("");
  }, [query, sort]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setProducts([]);
      setHasMore(false);
      return undefined;
    }

    let cancelled = false;

    async function fetchSearchResults() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await axios.get(`${API_BASE}/api/products/search`, {
          params: { q: trimmedQuery, page, limit: 12, sort },
        });

        if (cancelled) return;

        setProducts((prev) => {
          const existingIds = new Set(prev.map((product) => product.id));
          const newProducts = (response.data.products || []).filter(
            (product) => !existingIds.has(product.id)
          );
          return [...prev, ...newProducts];
        });
        setHasMore(Boolean(response.data.hasMore));
      } catch (error) {
        if (!cancelled) {
          setLoadError(error?.response?.data?.message || "Search Results Could Not Load. Try Again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSearchResults();
    return () => {
      cancelled = true;
    };
  }, [page, query, sort]);

  useEffect(() => {
    return () => {
      window.clearTimeout(debounceTimer.current);
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchInput(value);

    window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        navigate(`/search?q=${encodeURIComponent(trimmedValue)}`);
      }
    }, 250);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedValue = searchInput.trim();
    if (trimmedValue) {
      navigate(`/search?q=${encodeURIComponent(trimmedValue)}`);
    }
  };

  return (
    <div className="site-shell min-h-screen">
      <Seo
        title={query ? `Search Results For ${query}` : "Search 3D Prints"}
        description="Search physical 3D printed products and downloadable 3D model files on 3Dprintings.xyz."
        path="/search"
        noIndex
      />
      <Navbar isSignedIn={Boolean(user)} NoNavBarLimit />
      <main id="main-content" className="px-4 pb-16 pt-28 sm:px-6 lg:px-[5vw]">
        <section className="mx-auto max-w-7xl" aria-labelledby="search-heading">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="focus-ring mb-6 rounded-2xl border border-orange-100 bg-white/80 px-4 py-2 text-sm font-black text-gray-700 shadow-sm transition-colors duration-200 hover:border-orange-300 hover:text-orange-700"
          >
            Back
          </button>

          <div className="mb-8 overflow-hidden rounded-[2rem] border border-orange-100/80 bg-white/84 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)] backdrop-blur sm:p-7 lg:p-8">
            <form onSubmit={handleSubmit} role="search" className="mx-auto max-w-3xl">
              <label htmlFor="search-results-input" className="sr-only">
                Search Marketplace
              </label>
              <input
                id="search-results-input"
                name="q"
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search brackets, planters, props, STL files…"
                value={searchInput}
                onChange={handleSearchChange}
                className="focus-ring w-full rounded-3xl border border-orange-200 bg-white px-5 py-4 text-lg font-bold text-gray-950 shadow-sm transition-colors duration-200 placeholder:text-gray-400 hover:border-orange-400"
              />
            </form>

            <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">Search</p>
                <h1 id="search-heading" className="mt-3 text-balance font-display text-3xl font-black tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
                  {query ? (
                    <>Results For <span className="text-orange-700">{query}</span></>
                  ) : (
                    "Tell Us What You Need Printed"
                  )}
                </h1>
                <p className="mt-3 text-sm font-semibold leading-7 text-gray-600">
                  {query
                    ? products.length > 0
                      ? `${products.length} matching listings loaded.`
                      : "Searching products, files, shops, and tags."
                    : "Start with the object, part, style, file type, or material you have in mind."}
                </p>
              </div>

              <div className="relative">
                <label className="sr-only" htmlFor="search-sort">Sort Search Results</label>
                <select
                  id="search-sort"
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

          {loadError && (
            <div role="status" aria-live="polite" className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {loadError}
            </div>
          )}

          {products.length === 0 && !loading ? (
            <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white/72 px-6 py-16 text-center shadow-sm">
              <h2 className="font-display text-2xl font-black text-gray-950">
                {query ? "No Matching Listings Yet" : "Search The Marketplace"}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-gray-600">
                {query
                  ? "Try a broader term, search by object type, or check back as more sellers publish prints and files."
                  : "Use the search box above to find physical prints, digital model files, shops, and 3D printed goods."}
              </p>
            </div>
          ) : (
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
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-gray-500">Searching…</p>
            </div>
          )}

          {!hasMore && products.length > 0 && (
            <div className="py-12 text-center text-sm font-black uppercase tracking-[0.22em] text-gray-400">
              End Of Search Results
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SearchResults;
