import React, { useState, useEffect, useCallback, useRef } from "react";
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Ensure backend matches: http://localhost:3000/api/products?page=...&limit=12
      const response = await fetch(`http://localhost:3000/api/products?page=${page}&limit=12`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      setProducts(prev => {
        // Prevent duplicate products in the list
        const existingIds = new Set(prev.map(p => p.id));
        const newProducts = data.products.filter(p => !existingIds.has(p.id));
        return [...prev, ...newProducts];
      });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page]);

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar isSignedIn={!!user} NoNavBarLimit={NoNavBarLimit} />
      <main className="px-4 lg:px-[5vw] pt-24 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product, index) => {
            const isLastElement = products.length === index + 1;
            const cardProps = {
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
        
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
          </div>
        )}
        
        {!hasMore && products.length > 0 && (
          <div className="text-center py-12 text-gray-400 font-medium">
            You've seen all the listings.
          </div>
        )}

        {products.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-500">
            No products found.
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
