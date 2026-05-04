import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard.jsx";
import Navbar from "../components/NavBar.jsx";

const Products = ({ user, NoNavBarLimit }) => {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
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

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure backend matches: http://localhost:3000/api/products?page=...&limit=12
      console.log('[Products fetchProducts] Fetching page:', page);
      const response = await axios.get("http://localhost:3000/api/products", {
        params: { page, limit: 12 },
      });
      const data = response.data;
      console.log('[Products fetchProducts] Received', data.products.length, 'products');

      setProducts((prev) => {
        // Prevent duplicate products in the list
        const existingIds = new Set(prev.map((p) => p.id));
        const newProducts = (data.products || []).filter(
          (p) => !existingIds.has(p.id)
        );
        console.log('[Products fetchProducts] Adding', newProducts.length, 'new products');
        return [...prev, ...newProducts];
      });
      setHasMore(!!data.hasMore);
    } catch (error) {
      console.error(
        "[Products fetchProducts] Error:",
        error?.response?.data || error?.message || error
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar isSignedIn={!!user} NoNavBarLimit={NoNavBarLimit} />
      <main className="px-4 lg:px-[5vw] pt-24 pb-12">
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
              <div ref={lastProductElementRef} key={product.id} style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both` }}>
                <ProductCard {...cardProps} />
              </div>
            ) : (
              <div key={product.id} style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both` }}>
                <ProductCard {...cardProps} />
              </div>
            );
          })}
        </div>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-lg font-semibold text-gray-600 animate-pulse">Loading products...</p>
          </div>
        )}
        
        {!hasMore && products.length > 0 && (
          <div className="text-center py-12 text-gray-400 font-medium animate-fade-in-up transition-all duration-300 hover:text-gray-600">
            You've seen all the listings.
          </div>
        )}

        {products.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-500 animate-bounce transition-all duration-300 hover:text-gray-700">
            No products found.
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
