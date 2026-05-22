import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/NavBar.jsx";
import ProductCard from "../components/ProductCard.jsx";

const API_BASE = "https://3dprintings.xyz";

const printerLabels = {
  fdm: "FDM (Filament)",
  sla: "SLA (Resin)",
  both: "FDM and SLA",
};

export default function ShopInfo({ user }) {
  const { sellerId } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadShop() {
      setLoading(true);
      setError("");
      try {
        const response = await axios.get(`${API_BASE}/api/shops/${sellerId}`);
        if (cancelled) return;
        setShop(response.data?.shop || null);
        setProducts(response.data?.products || []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || "Failed to load shop.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShop();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const shopName = shop?.shopName || "Shop";
  const printerType = printerLabels[shop?.primaryPrinterSpecialization] || "";
  const hasDesignSoftware = Array.isArray(shop?.designSoftware) && shop.designSoftware.length > 0;

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar isSignedIn={!!user} />
      <main className="px-4 pb-12 pt-24 lg:px-[5vw]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-lg font-semibold text-gray-600">Loading shop...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>
        ) : (
          <>
            <section className="mb-8 rounded-lg bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-orange-100">
                  {shop?.shopLogoUrl ? (
                    <img src={shop.shopLogoUrl} alt={shopName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-orange-700">
                      {shopName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="break-words text-3xl font-black text-gray-900">{shopName}</h1>
                  {shop?.shopBio ? (
                    <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-600">{shop.shopBio}</p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {printerType ? (
                      <span className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                        {printerType}
                      </span>
                    ) : null}
                    {hasDesignSoftware
                      ? shop.designSoftware.map((software) => (
                          <span key={software} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
                            {software}
                          </span>
                        ))
                      : null}
                  </div>

                  {shop?.externalPortfolioLink ? (
                    <a
                      href={shop.externalPortfolioLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-orange-500 hover:text-orange-600"
                    >
                      Portfolio
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Models</h2>
                <Link to="/products" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                  Browse all
                </Link>
              </div>

              {products.length > 0 ? (
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
                  This shop has no models listed yet.
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
