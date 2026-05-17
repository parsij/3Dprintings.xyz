import React, { useEffect, useMemo, useState } from "react";
import Tags from "../../components/Tags.jsx";
import {
  getSellerProducts,
  updateSellerProduct,
} from "../services/sellerPortalService.js";
import SubmitModel from "./SubmitModel.jsx";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";

export default function SellerInventory() {
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editForms, setEditForms] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);

  // State to manage the popup modal view
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  useEffect(() => {
    reloadProducts();
  }, []);

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

  return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <SellerNavBar pageName={"Products"} />
        <SideMenu role={"seller"} title={"Seller Options"} />

        {/* Normalized page container with consistent fluid margins and padding */}
        <main className="max-w-7xl mx-auto px-4 lg:px-[5vw] pt-24 pb-12">

          {/* Dynamic Dashboard Top Header Section */}
          <div className="flex justify-between items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Inventory</h1>
              <div className="text-sm text-gray-500 mt-1">{formattedProductsCount} product(s) registered</div>
            </div>


            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-gray-950 text-white font-bold px-5 py-2.5 rounded-xl transition-all duration-300 ease-in-out transform-gpu hover:scale-105  shadow-md cursor-pointer whitespace-nowrap"
            >
              + New Product
            </button>
          </div>

          {/* Global Alert Notification Flags */}
          {productMessage && <p className="mb-4 text-sm font-medium text-green-700 bg-green-50 p-3 rounded-xl border border-green-200">{productMessage}</p>}
          {productsError && <p className="mb-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{productsError}</p>}
          {productsLoading && <p className="text-sm text-gray-600 animate-pulse">Loading items from your inventory...</p>}

          {/* Fallback Empty State Display */}
          {!productsLoading && sellerProducts.length === 0 && (
              <div className="text-center bg-white border border-gray-200 rounded-xl p-12 text-gray-500">
                No active product listings found on your account. Click "+ New Product" above to create one.
              </div>
          )}

          {/* Editable Inventory List Grid */}
          <div className="space-y-4">
            {sellerProducts.map((product) => {
              const form = editForms[product.id];
              if (!form) return null;

              return (
                  <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
                    <div className="mb-4 flex items-start gap-4">
                      {product.image_url ? (
                          <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-16 w-16 rounded-lg border border-gray-200 object-cover shadow-2xs"
                          />
                      ) : null}
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Product ID Reference: #{product.id}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 pl-1">Model Name</label>
                        <input
                            type="text"
                            value={form.modelName}
                            onChange={(event) =>
                                setEditForms((prev) => ({
                                  ...prev,
                                  [product.id]: { ...prev[product.id], modelName: event.target.value },
                                }))
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-orange-500 transition-colors text-gray-800"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 pl-1">Price ($)</label>
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
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-orange-500 transition-colors text-gray-800"
                        />
                      </div>

                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 pl-1">Category Placement</label>
                        <input
                            type="text"
                            value={form.category}
                            onChange={(event) =>
                                setEditForms((prev) => ({
                                  ...prev,
                                  [product.id]: { ...prev[product.id], category: event.target.value },
                                }))
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-orange-500 transition-colors text-gray-800"
                            placeholder="Category"
                        />
                      </div>

                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 pl-1">Model Description</label>
                        <textarea
                            rows={4}
                            value={form.description}
                            onChange={(event) =>
                                setEditForms((prev) => ({
                                  ...prev,
                                  [product.id]: { ...prev[product.id], description: event.target.value },
                                }))
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-orange-500 transition-colors text-gray-800 resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
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

                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                      <button
                          type="button"
                          onClick={() => handleSaveProduct(product.id)}
                          disabled={Number(savingProductId) === Number(product.id)}
                          className="rounded-lg bg-gray-950 font-bold px-5 py-2 text-white hover:bg-orange-600 transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                      >
                        {Number(savingProductId) === Number(product.id) ? "Saving Updates..." : "Save Changes"}
                      </button>
                    </div>
                  </article>
              );
            })}
          </div>
        </main>

        {/* POPUP MODAL COMPONENT WINDOW */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
              {/* Outer modal card container */}
              <div className="relative bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-gray-100 max-h-[90vh] overflow-y-auto pt-14">

                {/* Standardized Close Button ("X") positioned at the TOP LEFT */}
                <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 left-4 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-gray-100 flex items-center justify-center"
                    aria-label="Close form popup"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Injected Content form - dismisses popup automatically upon success validation */}
                <SubmitModel
                    onSubmissionSuccess={() => {
                      reloadProducts();
                      setIsModalOpen(false);
                    }}
                />
              </div>
            </div>
        )}
      </div>
  );
}