import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard.jsx";
import Navbar from "../components/NavBar.jsx";
import { API_BASE } from "../config/api.js";

const LikedProducts = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    if (!user) return;

    const fetchLikedProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE}/api/likes/liked-products`,
          { withCredentials: true }
        );
        setProducts(response.data.products || []);
      } catch (err) {
        console.error("Error fetching liked products:", err);
        
      } finally {
        setLoading(false);
      }
    };

    fetchLikedProducts();
  }, [user]);

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navbar isSignedIn={!!user} />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar isSignedIn={!!user} />
      <main className="px-4 lg:px-[5vw] pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900">
            Liked <span className="text-orange-500">Products</span>
          </h1>
          <p className="text-gray-600 mt-2">
            {products.length > 0 ? `You have ${products.length} liked products` : "You haven't liked any products yet"}
          </p>
        </div>

        {products.length === 0 && !loading ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No liked products yet.</p>
            <p className="text-gray-400 text-sm mt-2">Like products to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
               <ProductCard
                 key={product.id}
                 productId={product.id}
                 creatorName={product.creator_name}
                 productName={product.name}
                 rating={product.rating}
                 currentPrice={product.current_price}
                 originalPrice={product.original_price}
                 reviewNumber={product.reviews_count || 0}
                 imageUrl={product.image_url}
                 sellerId={product.seller_id || product.user_id}
                 shopName={product.shop_name}
                 shopLogoUrl={product.shop_logo_url}
                 quantity={product.quantity}
               />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LikedProducts;
