import { useEffect, useState } from "react";
import StarRating from "../../components/StarRating.jsx";
import { toggleReviewLike } from "../../services/likesService.js";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import {
  getSellerReviews,
  updateSellerReviewReply,
} from "../services/sellerPortalService.js";

export default function SellerReviews() {
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [sellerReviews, setSellerReviews] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingReplyId, setSavingReplyId] = useState(null);

  const reloadReviews = async () => {
    setReviewsLoading(true);
    setReviewsError("");
    try {
      const response = await getSellerReviews();
      const reviews = Array.isArray(response.reviews) ? response.reviews : [];
      setSellerReviews(reviews);
      setReplyDrafts(
        reviews.reduce((acc, review) => {
          acc[review.id] = review.sellerReply || "";
          return acc;
        }, {})
      );
    } catch (error) {
      setReviewsError(error?.response?.data?.message || "Failed to load seller reviews.");
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    reloadReviews();
  }, []);

  const handleToggleSellerReviewLike = async (reviewId) => {
    setReviewMessage("");
    try {
      const response = await toggleReviewLike(reviewId);
      setSellerReviews((prev) =>
        prev.map((review) => (
          Number(review.id) === Number(reviewId) ? { ...review, isLiked: Boolean(response?.isLiked) } : review
        ))
      );
    } catch (error) {
      setReviewMessage(error?.message || "Failed to toggle review like.");
    }
  };

  const handleSaveReviewReply = async (reviewId) => {
    setReviewMessage("");
    try {
      setSavingReplyId(reviewId);
      const response = await updateSellerReviewReply(reviewId, replyDrafts[reviewId] || "");
      setReviewMessage(response?.message || "Reply saved.");
      setSellerReviews((prev) =>
        prev.map((review) =>
          Number(review.id) === Number(reviewId)
            ? {
                ...review,
                sellerReply: response?.review?.sellerReply || "",
                sellerReplyUpdatedAt: response?.review?.sellerReplyUpdatedAt || null,
              }
            : review
        )
      );
    } catch (error) {
      setReviewMessage(error?.response?.data?.message || "Failed to save review reply.");
    } finally {
      setSavingReplyId(null);
    }
  };

  return (
    <section className={"mt-20"}>
      <SellerNavBar pageName={"Reviews"}/>
      <SideMenu role={"seller"} title={"Seller Options"}/>
      {reviewMessage ? <p className="mb-4 text-sm text-green-700">{reviewMessage}</p> : null}
      {reviewsError ? <p className="mb-4 text-sm text-red-600">{reviewsError}</p> : null}
      {reviewsLoading ? <p className="text-sm text-gray-600">Loading reviews...</p> : null}

      {!reviewsLoading && sellerReviews.length === 0 ? (
        <p className="text-sm text-gray-600">No product reviews yet.</p>
      ) : null}

      <div className="space-y-4">
        {sellerReviews.map((review) => (
          <article key={review.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-start gap-3">
              {review.productImageUrl ? (
                <img
                  src={review.productImageUrl}
                  alt={review.productName}
                  className="h-14 w-14 rounded-md border border-gray-200 object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-gray-900">{review.productName}</h3>
                <p className="text-xs text-gray-500">{review.username}</p>
                <StarRating
                  value={Math.max(1, Math.min(5, Number(review.rating) || 0))}
                  readOnly
                  className="mt-1"
                  starClassName="h-4 w-4"
                />
              </div>
            </div>

            {review.content ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.content}</p> : null}

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleSellerReviewLike(review.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  review.isLiked ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {review.isLiked ? "Liked" : "Like"}
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Reply</label>
              <textarea
                rows={3}
                value={replyDrafts[review.id] ?? ""}
                onChange={(event) =>
                  setReplyDrafts((prev) => ({ ...prev, [review.id]: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Write your response to this review..."
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {review.sellerReplyUpdatedAt ? `Updated: ${new Date(review.sellerReplyUpdatedAt).toLocaleString()}` : "No reply yet"}
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveReviewReply(review.id)}
                  disabled={Number(savingReplyId) === Number(review.id)}
                  className="rounded-md bg-black px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {Number(savingReplyId) === Number(review.id) ? "Saving..." : "Save Reply"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}