import React, { useEffect, useMemo, useState } from "react";
import Tags from "../../components/Tags.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import ProductSpecsFields from "../components/ProductSpecsFields.jsx";
import { validateProductSpecs } from "../services/productSpecsValidation.js";
import { FieldLabel, FIELD_CLASS } from "../components/listingFormUi.jsx";
import {
  getSellerProducts,
  updateSellerProduct,
} from "../services/sellerPortalService.js";
import SubmitModel, { CATEGORY_DATA } from "./SubmitModel.jsx";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import {
  productToFormDimensions,
  toCanonicalDimensions,
} from "../../utils/productDimensions.js";
import { PenLine as EditIcon, Save as SaveIcon, Check as CheckIcon, X as XIcon } from "lucide-react";

const categoryGroups = CATEGORY_DATA.map((group) => ({
  label: group.title,
  options: group.subcategories.map((sub) => ({
    value: sub.label,
    label: sub.label,
  })),
}));

function buildEditForm(product) {
  return {
    modelName: product.name || "",
    description: product.description || "",
    price: String(product.current_price ?? ""),
    category: product.category || "",
    tags: Array.isArray(product.tags) ? product.tags : [],
    quantity: String(product.quantity ?? "1"),
    ...productToFormDimensions(product),
  };
}

export default function SellerInventory() {
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editForms, setEditForms] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);
  const [successProductId, setSuccessProductId] = useState(null);
  const [errorProductId, setErrorProductId] = useState(null);
  const [editSubmitted, setEditSubmitted] = useState(false);

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
          acc[product.id] = buildEditForm(product);
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

  const editingForm = editingProduct ? editForms[editingProduct.id] : null;

  const editingErrors = useMemo(() => {
    if (!editingForm) return {};

    const nextErrors = {};

    if (editingForm.modelName.trim().length < 3) {
      nextErrors.modelName = "Model name must be at least 3 characters.";
    } else if (!/^[a-zA-Z0-9 ]+$/.test(editingForm.modelName.trim())) {
      nextErrors.modelName = "Model name can only contain letters, numbers and space.";
    }

    if (editingForm.description.trim().length < 20) {
      nextErrors.description = "Description must be at least 20 characters.";
    }

    const parsedPrice = Number(editingForm.price);
    if (!editingForm.price || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      nextErrors.price = "Enter a valid price greater than 0.";
    }

    if (!editingForm.category) {
      nextErrors.category = "Please select a specific category.";
    }

    const parsedQuantity = Number(editingForm.quantity);
    if (
      editingForm.quantity === ""
      || Number.isNaN(parsedQuantity)
      || !Number.isInteger(parsedQuantity)
      || parsedQuantity < 0
    ) {
      nextErrors.quantity = "Quantity must be a whole number.";
    }

    Object.assign(nextErrors, validateProductSpecs(editingForm));

    return nextErrors;
  }, [editingForm]);

  const isEditingFormValid = editingForm ? Object.keys(editingErrors).length === 0 : false;

  const handleSaveProduct = async (productId, { closeEditor = false, fromEditor = false } = {}) => {
    const form = editForms[productId];
    if (!form) return;

    if (fromEditor) {
      setEditSubmitted(true);
      if (!isEditingFormValid) return;
    }

    setProductsError("");
    try {
      setSavingProductId(productId);
      setErrorProductId(null);

      const canonical = fromEditor ? toCanonicalDimensions(form) : null;
      const response = await updateSellerProduct(productId, {
        modelName: form.modelName,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        tags: form.tags,
        quantity: form.quantity,
        ...(fromEditor
          ? {
              modelWeight: form.modelWeight,
              modelWeightUnit: form.modelWeightUnit,
              modelHeight: form.modelHeight,
              modelWidth: form.modelWidth,
              modelLength: form.modelLength,
              modelDimensionUnit: form.modelDimensionUnit,
              daysToPrepare: Number(form.daysToPrepare),
              modelWeightG: canonical.modelWeightG,
              modelHeightMm: canonical.modelHeightMm,
              modelWidthMm: canonical.modelWidthMm,
              modelLengthMm: canonical.modelLengthMm,
            }
          : {}),
      });

      setSellerProducts((prev) =>
        prev.map((product) => (Number(product.id) === Number(productId) ? { ...product, ...response.product } : product))
      );
      setEditForms((prev) => ({
        ...prev,
        [productId]: buildEditForm(response.product),
      }));

      if (closeEditor) {
        setEditingProduct(null);
        setEditSubmitted(false);
      }

      setSavingProductId(null);
      setSuccessProductId(productId);
      setTimeout(() => setSuccessProductId(null), 2000);
    } catch (error) {
      setSavingProductId(null);
      setErrorProductId(productId);
      setProductsError(error?.response?.data?.message || "Failed to update product.");
      setTimeout(() => setErrorProductId(null), 3000);
    }
  };

  const updateEditingForm = (updates) => {
    if (!editingProduct) return;
    setEditForms((prev) => ({
      ...prev,
      [editingProduct.id]: { ...prev[editingProduct.id], ...updates },
    }));
    setErrorProductId(null);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <SellerNavBar pageName={"Products"} />
      <SideMenu role={"seller"} title={"Seller Options"} />

      <main className="max-w-7xl mx-auto px-4 lg:px-[5vw] pt-24 pb-12">
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

        {productsError ? (
          <p className="mb-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{productsError}</p>
        ) : null}
        {productsLoading ? <p className="text-sm text-gray-600 animate-pulse">Loading items from your inventory...</p> : null}

        {!productsLoading && sellerProducts.length === 0 ? (
          <div className="text-center bg-white border border-gray-200 rounded-xl p-12 text-gray-500">
            No active product listings found on your account. Click "+ New Product" above to create one.
          </div>
        ) : null}

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

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-gray-600">Quantity:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForms[product.id]?.quantity ?? ""}
                      onChange={(event) => {
                        setEditForms((prev) => ({
                          ...prev,
                          [product.id]: { ...prev[product.id], quantity: event.target.value },
                        }));
                        setErrorProductId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.stopPropagation();
                          handleSaveProduct(product.id);
                          event.currentTarget.blur();
                        }
                      }}
                      className="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-orange-500 transition-colors text-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {(() => {
                      const originalQty = String(product.quantity ?? "1");
                      const currentQty = String(editForms[product.id]?.quantity ?? "");
                      const qtyNumber = Number(currentQty);
                      const isValidWholeNumber = currentQty !== "" && !Number.isNaN(qtyNumber) && Number.isInteger(qtyNumber) && qtyNumber >= 0;
                      const isChanged = originalQty !== currentQty && isValidWholeNumber;
                      const isDisabled = !isChanged || savingProductId === product.id;
                      const isSuccess = successProductId === product.id;
                      const isError = errorProductId === product.id;

                      return (
                        <button
                          type="button"
                          onClick={() => handleSaveProduct(product.id)}
                          disabled={isDisabled || isSuccess || isError}
                          title={isDisabled ? "No changes to save" : isSuccess ? "Saved!" : isError ? "Failed to update!" : "Save quantity"}
                          className={`p-1.5 rounded-md border flex items-center justify-center transition-all duration-300 ${
                            isSuccess
                              ? "border-green-500 bg-green-500 text-white cursor-default"
                              : isError
                              ? "border-red-500 bg-red-500 text-white cursor-default"
                              : isDisabled
                              ? "border-gray-200 bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "border-gray-300 bg-white text-gray-950 hover:bg-gray-50 cursor-pointer shadow-sm"
                          }`}
                        >
                          {savingProductId === product.id ? (
                            <span className="h-4 w-4 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></span>
                          ) : isSuccess ? (
                            <CheckIcon className="h-4 w-4 animate-pulse" />
                          ) : isError ? (
                            <XIcon className="h-4 w-4 animate-pulse" />
                          ) : (
                            <SaveIcon className="h-4 w-4" />
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(product);
                      setEditSubmitted(false);
                    }}
                    className="bg-gray-950 text-white font-bold p-2.5 sm:px-4 sm:py-2 rounded-xl transition-all duration-300 ease-in-out transform-gpu hover:scale-105 shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
                  >
                    <EditIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit Product</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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
      ) : null}

      {editingProduct && editingForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl p-6 border border-gray-100 max-h-[90vh] overflow-y-auto pt-14">
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setEditSubmitted(false);
              }}
              className="absolute top-4 left-4 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              aria-label="Close editor popup"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div>
              <div className="mb-6 flex items-center gap-3">
                {editingProduct.image_url ? (
                  <img src={editingProduct.image_url} alt="" className="h-12 w-12 rounded-lg object-cover border" />
                ) : null}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit Product Details</h2>
                  <p className="text-xs text-gray-500">Update shipping specs, pricing, and listing details.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 group transition-all duration-300 hover:translate-x-1">
                  <FieldLabel htmlFor="editModelName">Model name</FieldLabel>
                  <input
                    id="editModelName"
                    type="text"
                    value={editingForm.modelName}
                    onChange={(event) => updateEditingForm({ modelName: event.target.value })}
                    className={FIELD_CLASS}
                  />
                  {editSubmitted && editingErrors.modelName ? (
                    <p className="mt-1 text-xs text-red-500">{editingErrors.modelName}</p>
                  ) : null}
                </div>

                <div className="group transition-all duration-300 hover:translate-x-1">
                  <FieldLabel htmlFor="editPrice">Price (USD)</FieldLabel>
                  <input
                    id="editPrice"
                    type="text"
                    value={editingForm.price}
                    onChange={(event) => updateEditingForm({ price: event.target.value })}
                    className={FIELD_CLASS}
                  />
                  {editSubmitted && editingErrors.price ? (
                    <p className="mt-1 text-xs text-red-500">{editingErrors.price}</p>
                  ) : null}
                </div>

                <div className="group transition-all duration-300 hover:translate-x-1">
                  <FieldLabel htmlFor="editQuantity">Quantity</FieldLabel>
                  <input
                    id="editQuantity"
                    type="number"
                    min="0"
                    step="1"
                    value={editingForm.quantity}
                    onChange={(event) => updateEditingForm({ quantity: event.target.value })}
                    className={`${FIELD_CLASS} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  />
                  {editSubmitted && editingErrors.quantity ? (
                    <p className="mt-1 text-xs text-red-500">{editingErrors.quantity}</p>
                  ) : null}
                </div>

                <div className="sm:col-span-2 group transition-all duration-300 hover:translate-x-1">
                  <FieldLabel htmlFor="editCategory">Category</FieldLabel>
                  <CustomSelect
                    id="editCategory"
                    name="category"
                    value={editingForm.category}
                    onChange={(nextValue) => updateEditingForm({ category: nextValue })}
                    placeholder="Select a category..."
                    ariaLabel="Category"
                    groups={categoryGroups}
                  />
                  {editSubmitted && editingErrors.category ? (
                    <p className="mt-1 text-xs text-red-500">{editingErrors.category}</p>
                  ) : null}
                  {editingForm.category === "Other" ? (
                    <p className="mt-2 text-xs text-red-600 font-semibold">
                      Setting your product category as "Other" makes your products have less sales compared to others.
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2 group transition-all duration-300 hover:translate-x-1">
                  <FieldLabel htmlFor="editDescription">Model description</FieldLabel>
                  <textarea
                    id="editDescription"
                    rows={5}
                    value={editingForm.description}
                    onChange={(event) => updateEditingForm({ description: event.target.value })}
                    className={`${FIELD_CLASS} resize-none`}
                  />
                  {editSubmitted && editingErrors.description ? (
                    <p className="mt-1 text-xs text-red-500">{editingErrors.description}</p>
                  ) : null}
                </div>

                <ProductSpecsFields
                  form={editingForm}
                  onUnitChange={(field, value) => updateEditingForm({ [field]: value })}
                  onDimensionValueChange={(field, value) => updateEditingForm({ [field]: value })}
                  onDaysToPrepareChange={(value) => updateEditingForm({ daysToPrepare: value })}
                  showErrors={editSubmitted}
                  errors={editingErrors}
                />
              </div>

              <div className="mt-4">
                <Tags
                  tags={editingForm.tags}
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

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setEditSubmitted(false);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingProductId === editingProduct.id}
                  onClick={() => handleSaveProduct(editingProduct.id, { closeEditor: true, fromEditor: true })}
                  className={`rounded-xl px-5 py-2 text-sm font-semibold shadow-xs transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                    successProductId === editingProduct.id
                      ? "bg-green-500 text-white border border-green-600 hover:bg-green-600"
                      : errorProductId === editingProduct.id
                      ? "bg-red-500 text-white border border-red-600 hover:bg-red-600"
                      : savingProductId === editingProduct.id
                      ? "bg-orange-500 text-white opacity-50 cursor-not-allowed"
                      : "bg-orange-500 text-white hover:bg-orange-400"
                  }`}
                >
                  {savingProductId === editingProduct.id ? (
                    <>
                      <span className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                      Saving changes...
                    </>
                  ) : successProductId === editingProduct.id ? (
                    <>
                      <CheckIcon className="h-4 w-4 animate-pulse" />
                      Saved!
                    </>
                  ) : errorProductId === editingProduct.id ? (
                    <>
                      <XIcon className="h-4 w-4 animate-pulse" />
                      Failed to save
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
