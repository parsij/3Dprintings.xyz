import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard.jsx";
import Navbar from "../components/NavBar.jsx";
import backIcon from "../assets/back.svg";

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
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar isSignedIn={!!user} />
      <main className="px-4 lg:px-[5vw] pt-24 pb-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-2 rounded-lg hover:bg-gray-300 transition-all duration-300 cursor-pointer hover:scale-110 active:scale-90 shadow-sm hover:shadow-md"
        >
          <img src={backIcon} alt="Back" className="h-9 w-9" />
        </button>

        {/* Search box on the page */}
        <div className="mb-8 animate-fade-in-up">
          <div className="relative w-full max-w-2xl mx-auto mb-6 group">
            <input
              type="text"
              placeholder="Search for 3D models..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full bg-white text-gray-900 placeholder:text-gray-400 px-4 py-3 rounded-xl border-2 border-gray-300 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 shadow-sm focus:shadow-lg transition-all duration-300 hover:border-gray-400"
            />
          </div>

          <div className="transition-all duration-500 ease-in-out transform hover:translate-x-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 transition-colors duration-300">
              Search Results for "<span className="text-orange-500 hover:text-orange-600 transition-colors">{query}</span>"
            </h1>
            <p className="text-gray-600 mt-2 animate-pulse">
              {products.length > 0 ? `Found ${products.length} products` : "No products found"}
            </p>
          </div>
        </div>

        {products.length === 0 && !loading ? (
          <div className="text-center py-20 animate-bounce">
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
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-lg font-semibold text-gray-600">Loading...</p>
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


