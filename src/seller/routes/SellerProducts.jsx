import { useEffect, useMemo, useState } from "react";
import Tags from "../../components/Tags.jsx";
import {
  getSellerProducts,
  updateSellerProduct,
} from "../services/sellerPortalService.js";
import SubmitModel from "./SubmitModel.jsx";

export default function SellerProducts() {
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editForms, setEditForms] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);

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
  );
}