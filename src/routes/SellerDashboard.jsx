import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useMenu } from "../MenuContext.jsx";
import SideMenu from "../components/SideMenu.jsx";
import Tags from "../components/Tags.jsx";
import StarRating from "../components/StarRating.jsx";
import SellerDashboardTopMetricsRow from "../components/SellerDashboardTopMetricsRow.jsx";
import SellerDashboardSalesLineChart from "../components/SellerDashboardSalesLineChart.jsx";
import SellerDashboardTopSellingProducts from "../components/SellerDashboardTopSellingProducts.jsx";
import SellerDashboardAverageScore from "../components/SellerDashboardAverageScore.jsx";
import SellerDashboardRevenueBarChart from "../components/SellerDashboardRevenueBarChart.jsx";
import { getSellerDashboard } from "../services/sellerDashboardService.js";
import { toggleReviewLike } from "../services/likesService.js";
import {
  getSellerPreferences,
  updateSellerPreferences,
  getSellerProducts,
  updateSellerProduct,
  getSellerReviews,
  updateSellerReviewReply,
} from "../services/sellerPortalService.js";
import SubmitModel from "./SubmitModel.jsx";

const SELLER_MENU_ITEMS = [
  { label: "Dashboard", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Reviews", to: "/reviews" },
  { label: "Preferences", to: "/preferences" },
];

function SellerTopBar() {
  const { setMenuOpen } = useMenu();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3">
        <Link to="/" className="text-xl font-extrabold text-gray-900 hover:text-orange-500 transition">
          3z Seller
        </Link>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:border-orange-300 hover:text-orange-500 transition"
          aria-label="Open seller menu"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}

export default function SellerDashboard() {
  const location = useLocation();
  const activePath = location.pathname;

  const [metrics, setMetrics] = useState([
    { title: "Total revenue of this month", value: "$0.00", subtext: "No change month over month" },
    { title: "Total reviews", value: "0", subtext: "No change month over month" },
    { title: "All time sales", value: "0", subtext: "No change month over month" },
  ]);
  const [salesData, setSalesData] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [averageScore, setAverageScore] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesForm, setPreferencesForm] = useState({
    storeName: "",
    supportEmail: "",
    storeDescription: "",
    notifyNewOrders: true,
    notifyNewReviews: true,
    notifyPayouts: false,
  });

  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editForms, setEditForms] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);

  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [sellerReviews, setSellerReviews] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingReplyId, setSavingReplyId] = useState(null);

  const reloadProducts = async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const response = await getSellerProducts();
      const products = Array.isArray(response.products) ? response.products : [];
      setSellerProducts(products);
      setEditForms(
        products.reduce((acc, product) => {
          acc[product.id] = {
            modelName: product.name || "",
            description: product.description || "",
            price: String(product.current_price ?? ""),
            category: product.category || "",
            tags: Array.isArray(product.tags) ? product.tags : [],
          };
          return acc;
        }, {})
      );
    } catch (error) {
      setProductsError(error?.response?.data?.message || "Failed to load seller products.");
    } finally {
      setProductsLoading(false);
    }
  };

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
    let cancelled = false;
    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError("");
      try {
        const data = await getSellerDashboard();
        if (cancelled) return;
        setMetrics(Array.isArray(data.metrics) ? data.metrics : []);
        setSalesData(Array.isArray(data.salesData) ? data.salesData : []);
        setTopProductsData(Array.isArray(data.products) ? data.products : []);
        setRevenueData(Array.isArray(data.revenueData) ? data.revenueData : []);
        setAverageScore(Number(data.averageScore || 0));
      } catch (err) {
        if (cancelled) return;
        setDashboardError(err?.response?.data?.message || "Failed to load seller dashboard.");
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    }
    if (activePath === "/") {
      loadDashboard();
    }
    return () => {
      cancelled = true;
    };
  }, [activePath]);

  useEffect(() => {
    if (activePath !== "/preferences") return;
    let cancelled = false;

    async function loadPreferences() {
      setPreferencesLoading(true);
      setPreferencesError("");
      try {
        const response = await getSellerPreferences();
        if (cancelled) return;
        setPreferencesForm((prev) => ({
          ...prev,
          ...response.preferences,
        }));
      } catch (error) {
        if (cancelled) return;
        setPreferencesError(error?.response?.data?.message || "Failed to load seller preferences.");
      } finally {
        if (!cancelled) setPreferencesLoading(false);
      }
    }

    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [activePath]);

  useEffect(() => {
    if (activePath === "/products" && sellerProducts.length === 0 && !productsLoading) {
      reloadProducts();
    }
  }, [activePath, productsLoading, sellerProducts.length]);

  useEffect(() => {
    if (activePath === "/reviews" && sellerReviews.length === 0 && !reviewsLoading) {
      reloadReviews();
    }
  }, [activePath, reviewsLoading, sellerReviews.length]);

  const formattedProductsCount = useMemo(() => sellerProducts.length, [sellerProducts.length]);

  const handleSaveProduct = async (productId) => {
    const form = editForms[productId];
    if (!form) return;
    setProductMessage("");
    setProductsError("");
    try {
      setSavingProductId(productId);
      const response = await updateSellerProduct(productId, {
        modelName: form.modelName,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        tags: form.tags,
      });
      setProductMessage(response?.message || "Product updated.");
      setSellerProducts((prev) =>
        prev.map((product) => (Number(product.id) === Number(productId) ? { ...product, ...response.product } : product))
      );
    } catch (error) {
      setProductsError(error?.response?.data?.message || "Failed to update product.");
    } finally {
      setSavingProductId(null);
    }
  };

  const handleSavePreferences = async (event) => {
    event.preventDefault();
    setPreferencesError("");
    setPreferencesMessage("");
    try {
      setPreferencesSaving(true);
      const response = await updateSellerPreferences(preferencesForm);
      setPreferencesMessage(response?.message || "Preferences updated.");
    } catch (error) {
      setPreferencesError(error?.response?.data?.message || "Failed to update preferences.");
    } finally {
      setPreferencesSaving(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SellerTopBar />
      <SideMenu title="Seller Menu" items={SELLER_MENU_ITEMS} />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-36">
        {activePath === "/" && (
          <section>
            {dashboardError ? (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dashboardError}</div>
            ) : null}

            {dashboardLoading ? (
              <div className="mb-6 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Loading dashboard...</div>
            ) : null}

            <SellerDashboardTopMetricsRow metrics={metrics.length ? metrics : [
              { title: "Total revenue of this month", value: "$0.00", subtext: "No change month over month" },
              { title: "Total reviews", value: "0", subtext: "No change month over month" },
              { title: "All time sales", value: "0", subtext: "No change month over month" },
            ]} />

            <div className="mb-6 mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SellerDashboardSalesLineChart data={salesData.length ? salesData : [{ day: "N/A", sales: 0 }]} />
              </div>
              <div className="lg:col-span-1">
                <SellerDashboardTopSellingProducts products={topProductsData} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <SellerDashboardAverageScore score={averageScore} />
              </div>
              <div className="lg:col-span-2">
                <SellerDashboardRevenueBarChart data={revenueData.length ? revenueData : [{ month: "N/A", revenue: 0 }]} />
              </div>
            </div>
          </section>
        )}

        {activePath === "/products" && (
          <section>
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-lg font-bold">Create Product</h2>
              <p className="mt-1 text-sm text-gray-600">Add a new listing directly from seller dashboard.</p>
              <SubmitModel onSubmissionSuccess={reloadProducts} />
            </div>

            <div className="mb-3 text-sm text-gray-600">{formattedProductsCount} product(s)</div>
            {productMessage ? <p className="mb-4 text-sm text-green-700">{productMessage}</p> : null}
            {productsError ? <p className="mb-4 text-sm text-red-600">{productsError}</p> : null}
            {productsLoading ? <p className="text-sm text-gray-600">Loading products...</p> : null}

            {!productsLoading && sellerProducts.length === 0 ? (
              <p className="text-sm text-gray-600">No products found yet.</p>
            ) : null}

            <div className="space-y-4">
              {sellerProducts.map((product) => {
                const form = editForms[product.id];
                if (!form) return null;

                return (
                  <article key={product.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-start gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-16 w-16 rounded-md border border-gray-200 object-cover"
                        />
                      ) : null}
                      <div>
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={form.modelName}
                        onChange={(event) =>
                          setEditForms((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], modelName: event.target.value },
                          }))
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.price}
                        onChange={(event) =>
                          setEditForms((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], price: event.target.value },
                          }))
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      />
                      <input
                        value={form.category}
                        onChange={(event) =>
                          setEditForms((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], category: event.target.value },
                          }))
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 md:col-span-2"
                        placeholder="Category"
                      />
                      <textarea
                        rows={4}
                        value={form.description}
                        onChange={(event) =>
                          setEditForms((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], description: event.target.value },
                          }))
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 md:col-span-2"
                      />
                    </div>

                    <div className="mt-3">
                      <Tags
                        tags={form.tags}
                        setTags={(updater) =>
                          setEditForms((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...prev[product.id],
                              tags: typeof updater === "function" ? updater(prev[product.id].tags) : updater,
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveProduct(product.id)}
                        disabled={Number(savingProductId) === Number(product.id)}
                        className="rounded-lg bg-black px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-60"
                      >
                        {Number(savingProductId) === Number(product.id) ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activePath === "/reviews" && (
          <section>
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
        )}

        {activePath === "/preferences" && (
          <section className="max-w-3xl">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-bold text-gray-900">Seller Preferences</h2>
              <p className="mt-1 text-sm text-gray-600">Control storefront details and seller notifications.</p>

              {preferencesMessage ? <p className="mt-3 text-sm text-green-700">{preferencesMessage}</p> : null}
              {preferencesError ? <p className="mt-3 text-sm text-red-600">{preferencesError}</p> : null}
              {preferencesLoading ? <p className="mt-3 text-sm text-gray-600">Loading preferences...</p> : null}

              <form className="mt-4 space-y-4" onSubmit={handleSavePreferences}>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Store Name</label>
                  <input
                    value={preferencesForm.storeName}
                    onChange={(event) => setPreferencesForm((prev) => ({ ...prev, storeName: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    maxLength={80}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Support Email</label>
                  <input
                    type="email"
                    value={preferencesForm.supportEmail}
                    onChange={(event) => setPreferencesForm((prev) => ({ ...prev, supportEmail: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Store Description</label>
                  <textarea
                    rows={4}
                    value={preferencesForm.storeDescription}
                    onChange={(event) => setPreferencesForm((prev) => ({ ...prev, storeDescription: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    maxLength={2000}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={preferencesForm.notifyNewOrders}
                      onChange={(event) => setPreferencesForm((prev) => ({ ...prev, notifyNewOrders: event.target.checked }))}
                    />
                    Email on new orders
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={preferencesForm.notifyNewReviews}
                      onChange={(event) => setPreferencesForm((prev) => ({ ...prev, notifyNewReviews: event.target.checked }))}
                    />
                    Email on new reviews
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={preferencesForm.notifyPayouts}
                      onChange={(event) => setPreferencesForm((prev) => ({ ...prev, notifyPayouts: event.target.checked }))}
                    />
                    Email on payout updates
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={preferencesSaving}
                  className="rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {preferencesSaving ? "Saving..." : "Save Preferences"}
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}