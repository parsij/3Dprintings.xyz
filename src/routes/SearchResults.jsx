import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard.jsx";
import Navbar from "../components/NavBar.jsx";

const SearchResults = ({ user }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const debounceTimer = useRef(null);

  const observer = useRef();

  const lastProductElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchSearchResults = async () => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }

    try {
      setLoading(true);
      console.log('[SearchResults] Fetching:', query, 'page:', page);
      const response = await axios.get(`http://localhost:3000/api/products/search`, {
        params: { q: query, page, limit: 12 }
      });

      console.log('[SearchResults] Response:', response.data);
      setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProducts = response.data.products.filter(p => !existingIds.has(p.id));
        return [...prev, ...newProducts];
      });
      setHasMore(response.data.hasMore);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setLoading(false);
    }
  };

  // Auto-search when URL query changes
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    fetchSearchResults();
  }, [page, query]);

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);

    // Debounce the search navigation
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (value.trim()) {
        navigate(`/search?q=${encodeURIComponent(value)}`);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar isSignedIn={!!user} />
      <main className="px-4 lg:px-[5vw] pt-24 pb-12">
        {/* Search box on the page */}
        <div className="mb-8">
          <div className="relative w-full max-w-2xl mx-auto mb-6">
            <input
              type="text"
              placeholder="Search for 3D models..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full bg-white text-gray-900 placeholder:text-gray-400 px-4 py-3 rounded-xl border-2 border-gray-300 outline-none focus:border-orange-500 transition-colors duration-300"
            />
          </div>

          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900">
              Search Results for "<span className="text-orange-500">{query}</span>"
            </h1>
            <p className="text-gray-600 mt-2">
              {products.length > 0 ? `Found ${products.length} products` : "No products found"}
            </p>
          </div>
        </div>

        {products.length === 0 && !loading ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No products match your search.</p>
            <p className="text-gray-400 text-sm mt-2">Try searching for something else.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product, index) => {
              const isLastElement = products.length === index + 1;
              const cardProps = {
                productId: product.id,
                creatorName: product.creator_name,
                productName: product.name,
                rating: product.rating,
                currentPrice: product.current_price,
                originalPrice: product.original_price,
                reviewNumber: product.reviews_count || 0,
                imageUrl: product.image_url,
              };

              return isLastElement ? (
                <div ref={lastProductElementRef} key={product.id}>
                  <ProductCard {...cardProps} />
                </div>
              ) : (
                <ProductCard key={product.id} {...cardProps} />
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
          </div>
        )}

        {!hasMore && products.length > 0 && (
          <div className="text-center py-12 text-gray-400 font-medium">
            You've seen all the results.
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchResults;


