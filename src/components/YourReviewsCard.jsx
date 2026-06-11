import React from 'react'
import image_test from "../assets/product-placeholder.webp";
import {Link} from "react-router-dom";
import editIcon from "../assets/edit.svg";
import trashIcon from "../assets/trash.svg";
import StarRating from "./StarRating.jsx";

const YourReviewsCard = ({
    productId,
    imageUrl,
    creatorName,
    productName,
    reviewId,
    rating,
    content,
    createdAt,
    onEdit,
    onDelete,
    isEditing,
    editForm,
    onEditChange,
    onEditCancel,
    onEditSave,
    isUpdatingReview,
    isDeletingReview,
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };
    return (
        <div className="w-full rounded-2xl border-2 border-black/10 bg-[#F6F1EA] p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-orange-300">
            <div className="flex gap-4">
                {/* Image */}
                <Link
                    to={`/product/${productId}`}
                    className="h-34 w-20 sm:h-35 sm:w-35 shrink-0 overflow-hidden rounded-xl bg-white/60 md:h-40 md:w-40 lg:h-45 lg:w-45 block hover:opacity-80 transition-all duration-300 hover:scale-105"
                >
                    <img
                        src={imageUrl || image_test}
                        alt={productName}
                        className="h-full w-full object-cover transition-all duration-300"
                        loading="lazy"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = image_test;
                        }}
                    />
                </Link>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                            <Link
                                to={`/product/${productId}`}
                                className="hover:underline hover:text-orange-500 transition-all duration-300"
                            >
                                <div
                                    className="truncate text-[15px] font-semibold text-black transition-all duration-300 hover:translate-x-1"
                                    title={productName}
                                >
                                    {productName}
                                </div>
                            </Link>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => onEdit && onEdit(reviewId, {rating, content})}
                                disabled={isUpdatingReview || isDeletingReview}
                                className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                aria-label="Edit review"
                                title="Edit review"
                            >
                                <img src={editIcon} alt="Edit" className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => onDelete && onDelete(reviewId)}
                                disabled={isDeletingReview}
                                className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                aria-label="Delete review"
                                title="Delete review"
                            >
                                <img src={trashIcon} alt="Delete" className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {creatorName && (
                        <div className="text-xs text-black/60 transition-all duration-300 hover:text-black/80 mb-2">
                            By {creatorName}
                        </div>
                    )}

                    {createdAt && (
                        <div className="text-xs text-black/40 mb-2">
                            {formatDate(createdAt)}
                        </div>
                    )}

                    {isEditing ? (
                        <div className="mt-3 space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-700">Rating</span>
                                <StarRating
                                    value={editForm?.rating || 5}
                                    onChange={(newRating) =>
                                        onEditChange && onEditChange({
                                            target: {
                                                name: "rating",
                                                value: newRating,
                                            },
                                        })
                                    }
                                />
                                <span className="text-xs font-medium text-gray-600">{editForm?.rating || 5}/5</span>
                            </div>

                            <textarea
                                name="content"
                                value={editForm?.content || ""}
                                onChange={(e) => onEditChange && onEditChange(e)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                placeholder="Update your review..."
                            />

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={onEditCancel}
                                    disabled={isUpdatingReview}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onEditSave && onEditSave(reviewId)}
                                    disabled={isUpdatingReview}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60"
                                >
                                    {isUpdatingReview ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <StarRating
                                value={Math.max(1, Math.min(5, Number(rating) || 0))}
                                readOnly
                                className="mt-1 mb-2"
                                starClassName="w-4 h-4"
                            />

                            {content && (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{content}</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
export default YourReviewsCard
