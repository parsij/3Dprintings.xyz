import React from "react";
import StarRating from "./StarRating.jsx";
import editIcon from "../assets/edit.svg";
import trashIcon from "../assets/trash.svg";

const Reviews = ({
  user,
  currentUserId,
  reviewForm,
  handleReviewInputChange,
  handleSubmitReview,
  isSubmittingReview,
  reviewMessage,
  reviewsLoading,
  reviewsError,
  reviews,
  formatReviewTimestamp,
  handleToggleReviewLike,
  editingReviewId,
  editReviewForm,
  isUpdatingReview,
  deleteModalReviewId,
  isDeletingReview,
  handleStartReviewEdit,
  handleEditReviewInputChange,
  handleCancelReviewEdit,
  handleSaveEditedReview,
  handleRequestDeleteReview,
  handleCancelDeleteReview,
  handleConfirmDeleteReview,
}) => {
  const isSuccessMessage =
    reviewMessage &&
    ["submitted", "updated", "deleted"].some((statusWord) =>
      reviewMessage.toLowerCase().includes(statusWord)
    );

  return (
    <section className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>

      <form onSubmit={handleSubmitReview} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center mb-3">
          <label className="text-sm font-semibold text-gray-700" htmlFor="review-rating">
            Rating
          </label>
          <div id="review-rating" className="flex items-center gap-3">
            <StarRating
              value={reviewForm.rating}
              onChange={(rating) =>
                handleReviewInputChange({
                  target: {
                    name: "rating",
                    value: rating,
                  },
                })
              }
            />
            <span className="text-sm font-medium text-gray-600">{reviewForm.rating}/5</span>
          </div>
        </div>

        <textarea
          name="content"
          value={reviewForm.content}
          onChange={handleReviewInputChange}
          rows={3}
          placeholder="Share your thoughts about this product..."
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white"
        />

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-500">
            {user ? "Your review helps others decide." : "Sign in to submit a review."}
          </p>
          <button
            type="submit"
            disabled={isSubmittingReview || !user}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmittingReview ? "Submitting..." : "Submit Review"}
          </button>
        </div>

        {reviewMessage && (
          <p className={`mt-3 text-sm ${isSuccessMessage ? "text-green-700" : "text-red-600"}`}>
            {reviewMessage}
          </p>
        )}
      </form>

      {reviewsLoading && (
        <p className="text-gray-500 text-sm">Loading reviews...</p>
      )}

      {reviewsError && !reviewsLoading && (
        <p className="text-red-600 text-sm">{reviewsError}</p>
      )}

      {!reviewsLoading && !reviewsError && reviews.length === 0 && (
        <p className="text-gray-500 text-sm">No reviews yet. Be the first to leave one.</p>
      )}

      {!reviewsLoading && !reviewsError && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isOwner = user && Number(currentUserId) === Number(review.user_id);
            const isEditing = Number(editingReviewId) === Number(review.id);

            return (
              <article key={review.id} className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {review.username || "Anonymous"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatReviewTimestamp(review.created_at)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <>
                        <button
                          onClick={() => handleStartReviewEdit(review)}
                          disabled={isUpdatingReview || isDeletingReview}
                          className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label="Edit review"
                        >
                          <img src={editIcon} alt="Edit" className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleRequestDeleteReview(review.id)}
                          disabled={isDeletingReview}
                          className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label="Delete review"
                        >
                          <img src={trashIcon} alt="Delete" className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={(event) => handleToggleReviewLike(review.id, event)}
                      className="p-2 rounded-full bg-gray-100 text-red-500 hover:bg-red-100 transition-all"
                      aria-label="Toggle review like"
                    >
                      {review.isLiked ? (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      ) : (
                        <svg className="w-4 h-4 fill-transparent stroke-current stroke-2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">Rating</span>
                      <StarRating
                        value={editReviewForm.rating}
                        onChange={(rating) =>
                          handleEditReviewInputChange({
                            target: {
                              name: "rating",
                              value: rating,
                            },
                          })
                        }
                      />
                      <span className="text-sm font-medium text-gray-600">{editReviewForm.rating}/5</span>
                    </div>

                    <textarea
                      name="content"
                      value={editReviewForm.content}
                      onChange={handleEditReviewInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white"
                      placeholder="Update your review..."
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelReviewEdit}
                        disabled={isUpdatingReview}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedReview(review.id)}
                        disabled={isUpdatingReview}
                        className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-60"
                      >
                        {isUpdatingReview ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <StarRating
                      value={Math.max(1, Math.min(5, Number(review.rating) || 0))}
                      readOnly
                      className="mt-2"
                      starClassName="w-4 h-4"
                    />

                    {review.content && (
                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{review.content}</p>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      {deleteModalReviewId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center px-4">
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
        </div>
      )}
    </section>
  );
};

export default Reviews;
