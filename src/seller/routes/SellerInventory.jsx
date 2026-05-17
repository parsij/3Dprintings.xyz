import React, { useEffect, useMemo, useState } from "react";
import Tags from "../../components/Tags.jsx";
import {
  getSellerProducts,
  updateSellerProduct,
} from "../services/sellerPortalService.js";
import SubmitModel from "./SubmitModel.jsx";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import { PencilLine as EditIcon } from "lucide-react";

export default function SellerInventory() {
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editForms, setEditForms] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);

  // States to manage the independent popup windows
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

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
      // Automatically dismiss the edit window popup when saving successfully finishes
      setEditingProduct(null);
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
                className="bg-gray-950 text-white font-bold px-5 py-2.5 rounded-xl transition-all duration-300 ease-in-out transform-gpu hover:scale-105 shadow-md cursor-pointer whitespace-nowrap"
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

          {/* Clean Dynamic Product Item Display List */}
          <div className="space-y-3">
            {sellerProducts.map((product) => {
              const form = editForms[product.id];
              if (!form) return null;

              return (
                  <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {product.image_url ? (
                          <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-14 w-14 rounded-lg border border-gray-200 object-cover shadow-3xs shrink-0"
                          />
                      ) : (
                          <div className="h-14 w-14 rounded-lg bg-gray-100 border border-gray-200 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                          <span className="font-semibold text-gray-800">${Number(product.current_price).toFixed(2)}</span>
                          <span>•</span>
                          <span className="truncate">{product.category || "No Category"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Premium GPU-accelerated Edit Activation Button */}
                    <button
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        className="bg-gray-950 text-white font-bold p-2.5 sm:px-4 sm:py-2 rounded-xl transition-all duration-300 ease-in-out transform-gpu hover:scale-105 hover:text-orange-500 shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
                    >
                      <EditIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit Product</span>
                    </button>
                  </article>
              );
            })}
          </div>
        </main>

        {/* POPUP MODAL COMPONENT WINDOW (NEW PRODUCT CREATION) */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
              <div className="relative bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-gray-100 max-h-[90vh] overflow-y-auto pt-14">

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

                <SubmitModel
                    onSubmissionSuccess={() => {
                      reloadProducts();
                      setIsModalOpen(false);
                    }}
                />
              </div>
            </div>
        )}

        {/* POPUP MODAL COMPONENT WINDOW (EDIT EXISTING PRODUCT DETAIL) */}
        {editingProduct && editForms[editingProduct.id] && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
              <div className="relative bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-gray-100 max-h-[90vh] overflow-y-auto pt-14">

                {/* Standardized Close Button ("X") positioned at the TOP LEFT */}
                <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="absolute top-4 left-4 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-gray-100 flex items-center justify-center"
                    aria-label="Close editor popup"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Inline Product Modal Content Block */}
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    {editingProduct.image_url && (
                        <img src={editingProduct.image_url} alt="" className="h-12 w-12 rounded-lg object-cover border" />
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Modify Listing Information</h2>
                      <p className="text-xs text-gray-400">Updating adjustments for item reference #{editingProduct.id}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-500 pl-1">Model Name</label>
                      <input
                          type="text"
                          value={editForms[editingProduct.id].modelName}
                          onChange={(event) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [editingProduct.id]: { ...prev[editingProduct.id], modelName: event.target.value },
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
                          value={editForms[editingProduct.id].price}
                          onChange={(event) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [editingProduct.id]: { ...prev[editingProduct.id], price: event.target.value },
                              }))
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-orange-500 transition-colors text-gray-800"
                      />
                    </div>

                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 pl-1">Category Placement</label>
                      <input
                          type="text"
                          value={editForms[editingProduct.id].category}
                          onChange={(event) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [editingProduct.id]: { ...prev[editingProduct.id], category: event.target.value },
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
                          value={editForms[editingProduct.id].description}
                          onChange={(event) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [editingProduct.id]: { ...prev[editingProduct.id], description: event.target.value },
                              }))
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-orange-500 transition-colors text-gray-800 resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Tags
                        tags={editForms[editingProduct.id].tags}
                        setTags={(updater) =>
                            setEditForms((prev) => ({
                              ...prev,
                              [editingProduct.id]: {
                                ...prev[editingProduct.id],
                                tags: typeof updater === "function" ? updater(prev[editingProduct.id].tags) : updater,
                              },
                            }))
                        }
                    />
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="rounded-lg border border-gray-300 font-bold px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSaveProduct(editingProduct.id)}
                        disabled={Number(savingProductId) === Number(editingProduct.id)}
                        className="rounded-lg bg-gray-950 font-bold px-5 py-2 text-white hover:bg-orange-600 transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      {Number(savingProductId) === Number(editingProduct.id) ? "Saving Updates..." : "Save Changes"}
                    </button>
                  </div>
                </div>

              </div>
            </div>
        )}
      </div>
  );
}