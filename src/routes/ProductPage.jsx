import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import cart from "../assets/Cart.svg"
import Navbar from "../components/NavBar.jsx";
import MessageShopButton from "../components/MessageShopButton.jsx";
import Reviews from "../components/Reviews.jsx";
import StarRating from "../components/StarRating.jsx";
import { addToCart } from "../services/cartService.js";
import { toggleLike, toggleSave, getProductStatus, toggleReviewLike } from "../services/likesService.js";
import image_test from "../assets/Screenshot_20260322_175244.png";

import { API_BASE } from "../config/api.js";

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
  const [quantity, setQuantity] = useState(1);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: "" });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewForm, setEditReviewForm] = useState({ rating: 5, content: "" });
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [deleteModalReviewId, setDeleteModalReviewId] = useState(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

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
        const response = await axios.get(`${API_BASE}/api/products/${id}`);
        setProduct(response.data);

        // Fetch like/save status
        const status = await getProductStatus(id);
        setIsLiked(status.isLiked);
        setIsSaved(status.isSaved);
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError(err?.response?.data?.message || "Failed to load product details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      setEditingReviewId(null);
      setDeleteModalReviewId(null);
      try {
        const response = await axios.get(`${API_BASE}/api/products/${id}/reviews`, {
          withCredentials: true,
        });
        setReviews(response.data?.reviews || []);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setReviewsError(err?.response?.data?.message || "Failed to load reviews.");
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [id]);

  // Derived images array
  const images = product?.images?.length ? product.images : [product?.image_url || image_test];

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => Math.min(prev + 1, images.length - 1));
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextImage, prevImage, isFullscreen]);

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

  const getShopDisplayName = () => product?.shop_name || product?.creator_name || "Unknown Shop";

  const formatReviewTimestamp = (timestamp) => {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return timestamp || "";
    }

    return parsed.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const createIconExplosion = (event, particleClassName = "heart-particle") => {
    const button = event?.currentTarget;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const particleCount = 9;

    for (let i = 0; i < particleCount; i += 1) {
      const particle = document.createElement("span");
      particle.className = particleClassName;
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;

      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 24 + Math.random() * 20;
      particle.style.setProperty("--particle-x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--particle-y", `${Math.sin(angle) * distance}px`);
      particle.style.animationDelay = `${Math.random() * 50}ms`;

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 800);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAddingToCart(true);
    setCartError(null);
    setCartSuccess(false);
    try {
      await addToCart(product.id, quantity);
      setCartSuccess(true);
      setQuantity(1);
      setTimeout(() => setCartSuccess(false), 2000);
    } catch (err) {
      console.error("Error adding to cart:", err);
      setCartError("Failed to add to cart. Please try again.");
      setTimeout(() => setCartError(null), 3000);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const toggleLikeClick = async (event) => {
    try {
      if (!user) {
        alert("Please sign in to like products");
        return;
      }
      createIconExplosion(event, "heart-particle");
      const result = await toggleLike(product.id);
      setIsLiked(result.isLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const toggleSaveClick = async (event) => {
    try {
      if (!user) {
        alert("Please sign in to save products");
        return;
      }
      createIconExplosion(event, "save-particle");
      const result = await toggleSave(product.id);
      setIsSaved(result.isSaved);
    } catch (error) {
      console.error("Error toggling save:", error);
    }
  };

  const handleReviewInputChange = (event) => {
    const { name, value } = event.target;
    setReviewForm((prev) => ({
      ...prev,
      [name]: name === "rating" ? Number(value) : value,
    }));
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    if (!user) {
      setReviewMessage("Please sign in to submit a review.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewMessage("");

    try {
      const response = await axios.post(
        `${API_BASE}/api/products/${id}/reviews`,
        {
          rating: reviewForm.rating,
          content: reviewForm.content,
        },
        { withCredentials: true }
      );

      const createdReview = response.data?.review;
      if (createdReview) {
        setReviews((prev) => [createdReview, ...prev]);
      }

      setProduct((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rating: response.data?.averageRating ?? prev.rating,
          reviews_count: response.data?.reviewsCount ?? (prev.reviews_count || 0) + 1,
        };
      });

      setReviewForm({ rating: 5, content: "" });
      setReviewMessage("Review submitted!");
    } catch (err) {
      console.error("Error submitting review:", err);
      setReviewMessage(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleToggleReviewLike = async (reviewId, event) => {
    try {
      if (!user) {
        alert("Please sign in to like reviews");
        return;
      }

      createIconExplosion(event, "heart-particle");
      const result = await toggleReviewLike(reviewId);
      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                isLiked: result.isLiked,
              }
            : review
        )
      );
    } catch (err) {
      console.error("Error toggling review like:", err);
    }
  };

  const handleStartReviewEdit = (review) => {
    if (!user) return;
    setEditingReviewId(review.id);
    setEditReviewForm({
      rating: Math.max(1, Math.min(5, Number(review.rating) || 5)),
      content: review.content || "",
    });
    setReviewMessage("");
  };

  const handleEditReviewInputChange = (event) => {
    const { name, value } = event.target;
    setEditReviewForm((prev) => ({
      ...prev,
      [name]: name === "rating" ? Number(value) : value,
    }));
  };

  const handleCancelReviewEdit = () => {
    setEditingReviewId(null);
    setEditReviewForm({ rating: 5, content: "" });
  };

  const handleSaveEditedReview = async (reviewId) => {
    if (!user) {
      setReviewMessage("Please sign in to edit a review.");
      return;
    }

    setIsUpdatingReview(true);
    setReviewMessage("");

    try {
      const response = await axios.put(
        `${API_BASE}/api/products/${id}/reviews/${reviewId}`,
        {
          rating: editReviewForm.rating,
          content: editReviewForm.content,
        },
        { withCredentials: true }
      );

      const updatedReview = response.data?.review;
      if (updatedReview) {
        setReviews((prev) =>
          prev.map((review) =>
            review.id === reviewId
              ? {
                  ...review,
                  ...updatedReview,
                  isLiked: review.isLiked,
                }
              : review
          )
        );
      }

      setProduct((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rating: response.data?.averageRating ?? prev.rating,
          reviews_count: response.data?.reviewsCount ?? prev.reviews_count,
        };
      });

      setEditingReviewId(null);
      setEditReviewForm({ rating: 5, content: "" });
      setReviewMessage("Review updated!");
    } catch (err) {
      console.error("Error updating review:", err);
      setReviewMessage(err?.response?.data?.message || "Failed to update review.");
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleRequestDeleteReview = (reviewId) => {
    setDeleteModalReviewId(reviewId);
    setReviewMessage("");
  };

  const handleCancelDeleteReview = () => {
    if (isDeletingReview) return;
    setDeleteModalReviewId(null);
  };

  const handleConfirmDeleteReview = async () => {
    if (!deleteModalReviewId) return;

    setIsDeletingReview(true);
    setReviewMessage("");

    try {
      const response = await axios.delete(
        `${API_BASE}/api/products/${id}/reviews/${deleteModalReviewId}`,
        { withCredentials: true }
      );

      const deletedReviewId = Number(response.data?.deletedReviewId ?? deleteModalReviewId);
      setReviews((prev) => prev.filter((review) => Number(review.id) !== deletedReviewId));

      setProduct((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rating: response.data?.averageRating ?? prev.rating,
          reviews_count: response.data?.reviewsCount ?? Math.max(0, (prev.reviews_count || 0) - 1),
        };
      });

      if (Number(editingReviewId) === deletedReviewId) {
        setEditingReviewId(null);
        setEditReviewForm({ rating: 5, content: "" });
      }

      setDeleteModalReviewId(null);
      setReviewMessage("Review deleted.");
    } catch (err) {
      console.error("Error deleting review:", err);
      setReviewMessage(err?.response?.data?.message || "Failed to delete review.");
    } finally {
      setIsDeletingReview(false);
    }
  };

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

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <Navbar isSignedIn={!!user} />
        <div className="flex flex-col justify-center items-center h-screen text-center px-4">
          <div className="text-center py-32 animate-fade-in-up">
            <p className="text-gray-600 mb-6 animate-bounce">{error || "Product not found"}</p>
            <Link to="/products" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg inline-block cursor-pointer">
              Back to Products
            </Link>
          </div>
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

      <main className="max-w-6xl mx-auto px-4 pt-24 lg:px-8 animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">

          {/* Product Image Section */}
          <div className="w-full md:w-1/2 lg:w-[55%] bg-gray-100 relative flex flex-col items-center justify-center p-6 sm:p-10 group overflow-hidden">

            <div
              className="relative w-full h-60 sm:h-96 md:h-125 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300"
              onClick={() => setIsFullscreen(true)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Carousel container showing prev, current, next */}
              <div className="flex w-full h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(${-currentImageIndex * 100 + (swipeOffset / window.innerWidth) * 100}%)` }}>
                {images.map((img, idx) => (
                  <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center bg-gray-100">
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
              <div className="absolute bottom-6 flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`h-2.5 rounded-full transition-colors duration-200 cursor-pointer ${
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
              <div className="flex gap-2 pt-1 shrink-0">
                <button onClick={toggleLikeClick} className="p-2.5 rounded-full bg-gray-100 hover:bg-red-100 hover:scale-110 active:scale-95 transition-all duration-200 text-red-500 cursor-pointer">
                  {isLiked ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  ) : (
                    <svg className="w-5 h-5 fill-transparent stroke-current stroke-2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  )}
                </button>
                <button onClick={toggleSaveClick} className="p-2.5 rounded-full bg-gray-100 hover:bg-blue-100 hover:scale-110 active:scale-95 transition-all duration-200 text-blue-600 cursor-pointer">
                  {isSaved ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                  ) : (
                    <svg className="w-5 h-5 fill-transparent stroke-current stroke-2" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Creator & Rating */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Link
                to={`/shop/${product.seller_id || product.user_id}`}
                className="flex min-w-0 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-orange-50 hover:text-orange-700"
              >
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-orange-100">
                  {product.shop_logo_url ? (
                    <img
                      src={product.shop_logo_url}
                      alt={getShopDisplayName()}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-orange-700">
                      {getShopDisplayName().slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0 truncate">By {getShopDisplayName()}</span>
              </Link>
              <MessageShopButton
                user={user}
                sellerId={product.seller_chat_id || product.seller_pocketbase_id || product.seller_id || product.user_id}
                iconOnly
                className="h-12 w-12 bg-gray-950 text-white hover:bg-orange-600 hover:scale-105 active:scale-95"
              />
              <div className="flex items-center gap-2">
                <StarRating
                  value={Math.max(0, Math.min(5, Number(product.rating) || 0))}
                  readOnly
                  starClassName="w-4 h-4"
                />
                <span className="font-bold text-gray-800">{product.rating ? Number(product.rating).toFixed(1) : "0.0"}</span>
                <span className="text-sm text-gray-500">({product.reviews_count || 0} reviews)</span>
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

               {product.quantity !== undefined && product.quantity !== null && Number(product.quantity) <= 2 && (
                 <div className="mt-3 text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                   Only {Number(product.quantity)} available in stock
                 </div>
               )}
             </div>

            {/* Description */}
            <div className="mb-auto">
              <h3 className="font-bold text-gray-900 mb-2">Description</h3>

              {/* Category */}
              {product.category && (
                <div className="mb-3">
                  <span className="text-sm font-semibold text-gray-700 mr-2">Category:</span>
                  <span className="text-sm bg-orange-50 px-2 py-1 rounded-md text-orange-600 border border-orange-100">{product.category}</span>
                </div>
              )}

              {/* Tags */}
              {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="text-sm font-semibold text-gray-700 mr-1 py-1">Tags:</span>
                  {product.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className={`text-gray-600 text-sm leading-relaxed whitespace-pre-wrap transition-all duration-300 ${!descriptionExpanded && 'line-clamp-3'}`}>
                {product.description || "No description provided for this 3D model."}
              </p>
              {product.description && product.description.split('\n').length > 2 && (
                <button
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="mt-2 text-orange-500 hover:text-orange-600 hover:scale-105 active:scale-95 font-semibold text-sm transition-all duration-200 cursor-pointer"
                >
                  {descriptionExpanded ? "Show Less" : "Show More"}
                </button>
              )}
            </div>

            {/* Add to Cart Actions */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              {cartError && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 animate-fade-in-up">
                  {cartError}
                </div>
              )}
              {cartSuccess && (
                <div className="mb-3 text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 flex items-center gap-2 animate-fade-in-up">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  Added to your cart successfully!
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-4 flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '0') {
                        setQuantity('');
                      } else {
                        const numValue = Math.max(1, parseInt(value) || 1);
                        setQuantity(numValue);
                      }
                    }}
                    className="px-4 py-2 font-semibold text-gray-900 min-w-12 text-center border-0 outline-none w-16"
                    placeholder="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1 || 2)}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 hover:scale-105 active:scale-95 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center text-lg gap-2 cursor-pointer"
                >
                  {isAddingToCart ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <img src={cart} className="w-6 h-6" alt="cart"/>
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        <Reviews
          user={user}
          currentUserId={user?.id}
          reviewForm={reviewForm}
          handleReviewInputChange={handleReviewInputChange}
          handleSubmitReview={handleSubmitReview}
          isSubmittingReview={isSubmittingReview}
          reviewMessage={reviewMessage}
          reviewsLoading={reviewsLoading}
          reviewsError={reviewsError}
          reviews={reviews}
          formatReviewTimestamp={formatReviewTimestamp}
          handleToggleReviewLike={handleToggleReviewLike}
          editingReviewId={editingReviewId}
          editReviewForm={editReviewForm}
          isUpdatingReview={isUpdatingReview}
          deleteModalReviewId={deleteModalReviewId}
          isDeletingReview={isDeletingReview}
          handleStartReviewEdit={handleStartReviewEdit}
          handleEditReviewInputChange={handleEditReviewInputChange}
          handleCancelReviewEdit={handleCancelReviewEdit}
          handleSaveEditedReview={handleSaveEditedReview}
          handleRequestDeleteReview={handleRequestDeleteReview}
          handleCancelDeleteReview={handleCancelDeleteReview}
          handleConfirmDeleteReview={handleConfirmDeleteReview}
        />
      </main>

      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-fade-in-up" >

          <div
            className="absolute inset-0 flex items-center justify-center w-full h-full cursor-pointer overflow-hidden transition-all duration-300"
            onClick={() => setIsFullscreen(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Carousel container showing all images */}
            <div className="flex w-full h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(${-currentImageIndex * 100 + (swipeOffset / window.innerWidth) * 100}%)` }}>
              {images.map((img, idx) => (
                <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center">
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
            className={`absolute bottom-0 inset-x-0 pb-6 pt-32 bg-linear-to-t from-black via-black/50 to-transparent flex flex-col items-center gap-4 transition-all duration-300 ease-out ${
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
                    className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 snap-center ${
                      currentImageIndex === idx ? "scale-105 shadow-lg shadow-orange-500/50 border-0" : "border-0 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsFullscreen(false)}
              className="bg-white/10 hover:bg-white/20 hover:scale-110 active:scale-95 backdrop-blur-md text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 border border-white/20 hover:border-white/40 cursor-pointer shadow-lg hover:shadow-xl"
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
