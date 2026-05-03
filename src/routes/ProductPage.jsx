import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/NavBar.jsx";
import { addToCart } from "../services/cartService.js";
import image_test from "../assets/Screenshot_20260322_175244.png";

const ProductPage = ({ user }) => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cart, Like, Save states
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Gallery states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenUi, setShowFullscreenUi] = useState(true);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`http://localhost:3000/api/products/${id}`);
        setProduct(response.data);
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError(err?.response?.data?.message || "Failed to load product details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Derived images array
  const images = product?.images?.length ? product.images : [product?.image_url || image_test];

  const nextImage = () => setCurrentImageIndex((prev) => Math.min(prev + 1, images.length - 1));
  const prevImage = () => setCurrentImageIndex((prev) => Math.max(prev - 1, 0));

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, isFullscreen]);

  // Autohide fullscreen UI
  useEffect(() => {
    if (!isFullscreen) return;
    let timer;
    const resetUi = () => {
      setShowFullscreenUi(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowFullscreenUi(false), 3000);
    };

    resetUi();
    window.addEventListener("mousemove", resetUi);
    window.addEventListener("touchstart", resetUi);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetUi);
      window.removeEventListener("touchstart", resetUi);
    };
  }, [isFullscreen]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setSwipeOffset(0);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
    const offset = touchEndX.current - touchStartX.current;
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    const swipeDelta = touchStartX.current - touchEndX.current;
    setSwipeOffset(0); // Reset offset for smooth transition back

    if (swipeDelta > 50) {
      nextImage(); // Swipe left
    } else if (swipeDelta < -50) {
      prevImage(); // Swipe right
    }
  };

  const formatPrice = (price) => {
    const num = Number(price);
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAddingToCart(true);
    setCartError(null);
    setCartSuccess(false);
    try {
      await addToCart(product.id, 1);
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 2000);
    } catch (err) {
      console.error("Error adding to cart:", err);
      setCartError("Failed to add to cart. Please try again.");
      setTimeout(() => setCartError(null), 3000);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const toggleLike = () => setIsLiked((prev) => !prev);
  const toggleSave = () => setIsSaved((prev) => !prev);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navbar isSignedIn={!!user} />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navbar isSignedIn={!!user} />
        <div className="flex flex-col justify-center items-center h-[80vh] text-center px-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error || "Product not found"}</p>
          <Link to="/products" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = product.original_price != null && Number(product.original_price) > Number(product.current_price);
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.original_price) - Number(product.current_price)) / Number(product.original_price)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#f2f2f2] pb-16">
      <Navbar isSignedIn={!!user} />

      <main className="max-w-6xl mx-auto px-4 pt-24 lg:px-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">

          {/* Product Image Section */}
          <div className="w-full md:w-1/2 lg:w-[55%] bg-gray-100 relative flex flex-col items-center justify-center p-6 sm:p-10 group overflow-hidden">

            <div
              className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => setIsFullscreen(true)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Carousel container showing prev, current, next */}
              <div className="flex w-full h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(${-currentImageIndex * 100 + (swipeOffset / window.innerWidth) * 100}%)` }}>
                {images.map((img, idx) => (
                  <div key={idx} className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gray-100">
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="max-h-full max-w-full object-contain rounded-2xl shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = image_test;
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-6 flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                      currentImageIndex === idx 
                        ? "w-6 bg-gray-800" 
                        : "w-2.5 bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="w-full md:w-1/2 lg:w-[45%] p-6 sm:p-10 flex flex-col">

            {/* Header: Title & Heart/Save */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
                {product.name}
              </h1>
              <div className="flex gap-2 isolate pt-1 shrink-0">
                <button onClick={toggleLike} className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 ease-out text-red-500 active:scale-90">
                  {isLiked ? (
                    <svg className="w-5 h-5 fill-current transition-all duration-300" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  ) : (
                    <svg className="w-5 h-5 fill-transparent stroke-current stroke-2 transition-all duration-300" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  )}
                </button>
                <button onClick={toggleSave} className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 ease-out text-blue-600 active:scale-90">
                  {isSaved ? (
                    <svg className="w-5 h-5 fill-current transition-all duration-300" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                  ) : (
                    <svg className="w-5 h-5 fill-transparent stroke-current stroke-2 transition-all duration-300" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Creator & Rating */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                By {product.creator_name || 'Unknown User'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-500">⭐</span>
                <span className="font-bold text-gray-800">{product.rating ? Number(product.rating).toFixed(1) : "0.0"}</span>
                <span className="text-sm text-gray-500 underline decoration-dashed cursor-pointer">({product.reviews_count || 0} reviews)</span>
              </div>
            </div>

            {/* Price Section */}
            <div className="mb-8">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-black">${formatPrice(product.current_price)}</span>
                {hasDiscount && (
                  <>
                    <span className="text-xl line-through text-gray-400 mb-1">${formatPrice(product.original_price)}</span>
                    <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded-lg text-sm mb-1">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Includes digital files & standard commercial license
              </p>
            </div>

            {/* Description */}
            <div className="mb-auto">
              <h3 className="font-bold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {product.description || "No description provided for this 3D model."}
              </p>
            </div>

            {/* Add to Cart Actions */}
            <div className="mt-8 pt-6 border-t border-gray-100 transition-all duration-300">
              {cartError && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 animate-in transition-all duration-300 ease-out">
                  {cartError}
                </div>
              )}
              {cartSuccess && (
                <div className="mb-3 text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 flex items-center gap-2 animate-in transition-all duration-300 ease-out">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  Added to your cart successfully!
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl shadow-orange-500/20 shadow-lg transition-all duration-300 ease-out disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center text-lg gap-2"
                >
                  {isAddingToCart ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center" >

          <div
            className="absolute inset-0 flex items-center justify-center w-full h-full cursor-pointer overflow-hidden"
            onClick={() => setIsFullscreen(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Carousel container showing all images */}
            <div className="flex w-full h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(${-currentImageIndex * 100 + (swipeOffset / window.innerWidth) * 100}%)` }}>
              {images.map((img, idx) => (
                <div key={idx} className="w-full h-full flex-shrink-0 flex items-center justify-center">
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    className="max-h-screen max-w-full object-contain select-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Auto-Hiding UI */}
          <div
            className={`absolute bottom-0 inset-x-0 pb-6 pt-32 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col items-center gap-4 transition-all duration-300 ease-out ${
              showFullscreenUi ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 px-4 max-w-full overflow-x-auto snap-x hide-scrollbar">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out snap-center ${
                      currentImageIndex === idx ? "scale-110 shadow-lg shadow-orange-500/50 border-0" : "border-0 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover transition-opacity duration-300" />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsFullscreen(false)}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 ease-out flex items-center gap-2 border border-white/20 hover:border-white/40 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              Close Fullscreen
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default ProductPage;

