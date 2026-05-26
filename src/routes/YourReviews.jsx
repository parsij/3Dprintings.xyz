import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate } from "react-router-dom";
import axios from "axios";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import YourReviewsCard from "../components/YourReviewsCard.jsx";

import { API_BASE } from "../config/api.js";

const YourReviews = ({ user }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewForm, setEditReviewForm] = useState({ rating: 5, content: "" });
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [deleteModalReviewId, setDeleteModalReviewId] = useState(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchUserReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE}/api/user/reviews`, {
          withCredentials: true,
        });
        setReviews(response.data?.reviews || []);
      } catch (err) {
        console.error("Error fetching user reviews:", err);
        setError(err?.response?.data?.message || "Failed to load your reviews.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserReviews();
  }, [user]);

  const handleStartReviewEdit = (reviewId, review) => {
    setEditingReviewId(reviewId);
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

    // Find the review to get product_id
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) {
      setReviewMessage("Review not found.");
      return;
    }

    setIsUpdatingReview(true);
    setReviewMessage("");

    try {
      const response = await axios.put(
        `${API_BASE}/api/products/${review.product_id}/reviews/${reviewId}`,
        {
          rating: editReviewForm.rating,
          content: editReviewForm.content,
        },
        { withCredentials: true }
      );

      const updatedReview = response.data?.review;
      if (updatedReview) {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  ...updatedReview,
                }
              : r
          )
        );
      }

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

    // Find the review to get product_id
    const review = reviews.find((r) => r.id === deleteModalReviewId);
    if (!review) {
      setReviewMessage("Review not found.");
      return;
    }

    setIsDeletingReview(true);
    setReviewMessage("");

    try {
      await axios.delete(
        `${API_BASE}/api/products/${review.product_id}/reviews/${deleteModalReviewId}`,
        { withCredentials: true }
      );

      const deletedReviewId = Number(deleteModalReviewId);
      setReviews((prev) => prev.filter((review) => Number(review.id) !== deletedReviewId));

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

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <>
      <SmallNavBar />
      <SideMenu />

      <main className="min-h-screen overflow-x-hidden bg-orange-50 px-4 pb-12 pt-24 text-gray-900">
        <section className="mx-auto w-full max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your <span className="text-orange-500">Reviews</span></h1>
            <p className="text-gray-600">Manage and view all your reviews</p>
          </div>

          {reviewMessage && (
            <p className={`mb-4 p-3 rounded-lg text-sm ${
              reviewMessage.toLowerCase().includes("deleted") || reviewMessage.toLowerCase().includes("updated")
                ? "text-green-700 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}>
              {reviewMessage}
            </p>
          )}

          {loading && (
            <p className="text-gray-500 text-center py-8">Loading your reviews...</p>
          )}

          {error && !loading && (
            <p className="text-red-600 text-center py-8">{error}</p>
          )}

          {!loading && !error && reviews.length === 0 && (
            <p className="text-gray-500 text-center py-8">You haven't written any reviews yet.</p>
          )}

          {!loading && !error && reviews.length > 0 && (
            <div className="space-y-4">
              {reviews.map((review) => (
                <YourReviewsCard
                  key={review.id}
                  productId={review.product_id}
                  imageUrl={review.image_url}
                  creatorName={review.username}
                  productName={review.product_name}
                  reviewId={review.id}
                  rating={review.rating}
                  content={review.content}
                  createdAt={review.created_at}
                  onEdit={handleStartReviewEdit}
                  onDelete={handleRequestDeleteReview}
                  isEditing={Number(editingReviewId) === Number(review.id)}
                  editForm={editReviewForm}
                  onEditChange={handleEditReviewInputChange}
                  onEditCancel={handleCancelReviewEdit}
                  onEditSave={handleSaveEditedReview}
                  isUpdatingReview={isUpdatingReview}
                  isDeletingReview={isDeletingReview}
                />
              ))}
            </div>
          )}

          {deleteModalReviewId && createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center px-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900">Delete review</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Are you sure you want to delete this review?
                </p>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelDeleteReview}
                    disabled={isDeletingReview}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteReview}
                    disabled={isDeletingReview}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-60"
                  >
                    {isDeletingReview ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </section>
      </main>
    </>
  );
};

export default YourReviews;

