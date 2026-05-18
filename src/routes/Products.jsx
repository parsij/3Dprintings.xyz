import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard.jsx";
import Navbar from "../components/NavBar.jsx";

const Products = ({ user, NoNavBarLimit }) => {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("relevant");
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
      // Ensure backend matches: https://3dprintings.xyz/api/products?page=...&limit=12
      console.log('[Products fetchProducts] Fetching page:', page, 'with sort:', sort);
      const response = await axios.get("https://3dprintings.xyz/api/products", {
        params: { page, limit: 12, sort },
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
  }, [page, sort]);

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
  }, [sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar isSignedIn={!!user} NoNavBarLimit={NoNavBarLimit} />
      <main className="px-4 lg:px-[5vw] pt-24 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Our Models</h1>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-xl leading-tight focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-sm cursor-pointer transition-all duration-300"
            >
              <option value="relevant">Most Relevant</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="sales">Most Sales</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>

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
               sellerId: product.seller_id || product.user_id,
               shopName: product.shop_name,
               shopLogoUrl: product.shop_logo_url,
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
