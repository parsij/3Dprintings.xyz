import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Lock, Package, Ruler, Scale } from "lucide-react";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import UnitNumberInput from "../components/UnitNumberInput.jsx";
import { FieldLabel, SectionTitle, FIELD_CLASS } from "../components/listingFormUi.jsx";
import {
  BOX_DIMENSION_UNITS,
  BOX_WEIGHT_UNITS,
  boxToFormValues,
  formatBoxDimensions,
  formatBoxWeight,
  toCanonicalBoxPayload,
  validateBoxDimensionInput,
  validateBoxWeightInput,
} from "../../utils/boxDimensions.js";
import {
  createSellerBox,
  deleteSellerBox,
  getSellerBoxes,
  updateSellerBox,
} from "../services/sellerPortalService.js";

const EMPTY_BOX = {
  name: "",
  width: "",
  length: "",
  height: "",
  maxWeight: "",
  dimensionUnit: "in",
  weightUnit: "lb",
};

export default function SellerBoxes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [boxes, setBoxes] = useState([]);
  const [productCount, setProductCount] = useState(0);
  const [coversLargestProduct, setCoversLargestProduct] = useState(true);
  const [largestProduct, setLargestProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_BOX);
  const [editingId, setEditingId] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const loadBoxes = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSellerBoxes();
      setBoxes(Array.isArray(data.boxes) ? data.boxes : []);
      setProductCount(Number(data.productCount || 0));
      setCoversLargestProduct(data.coversLargestProduct !== false);
      setLargestProduct(data.largestProduct || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load boxes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoxes();
  }, []);

  const formErrors = useMemo(() => {
    const nextErrors = {};
    const name = String(form.name || "").trim();
    if (name.length < 1 || name.length > 80) {
      nextErrors.name = "Box name must be between 1 and 80 characters.";
    }

    const widthError = validateBoxDimensionInput(form.width, form.dimensionUnit, "Width");
    if (widthError) nextErrors.width = widthError;

    const lengthError = validateBoxDimensionInput(form.length, form.dimensionUnit, "Length");
    if (lengthError) nextErrors.length = lengthError;

    const heightError = validateBoxDimensionInput(form.height, form.dimensionUnit, "Height");
    if (heightError) nextErrors.height = heightError;

    const weightError = validateBoxWeightInput(form.maxWeight, form.weightUnit);
    if (weightError) nextErrors.maxWeight = weightError;

    return nextErrors;
  }, [form]);

  const isFormValid = Object.keys(formErrors).length === 0;

  const resetForm = () => {
    setForm(EMPTY_BOX);
    setEditingId(null);
    setSubmitted(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isFormValid) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = toCanonicalBoxPayload(form);
      if (editingId) {
        await updateSellerBox(editingId, payload);
        setMessage("Box updated successfully.");
      } else {
        await createSellerBox(payload);
        setMessage("Box added successfully.");
      }
      resetForm();
      await loadBoxes();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save box.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (box) => {
    setEditingId(box.id);
    setForm(boxToFormValues(box, form.dimensionUnit, form.weightUnit));
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (box) => {
    if (!box.canDelete) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteSellerBox(box.id);
      setMessage("Box removed.");
      if (editingId === box.id) resetForm();
      await loadBoxes();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete box.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <SellerNavBar pageName="Boxes" />
      <SideMenu title="Seller Menu" role="seller" />
      <main className="mx-auto max-w-4xl px-4 pb-12 pt-28">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Shipping boxes</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Define the boxes you ship with. Products must fit inside at least one box at 95% capacity.
              {productCount > 0 ? " You must keep at least one box while products are listed." : ""}
            </p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Package className="h-4 w-4 text-orange-500" />
              {productCount} listed product{productCount === 1 ? "" : "s"}
            </div>
            <div className="mt-1 text-xs text-gray-500">{boxes.length} shipping box{boxes.length === 1 ? "" : "es"}</div>
          </div>
        </div>

        {!coversLargestProduct ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Your boxes do not fit your largest product at 95% capacity.</p>
            {largestProduct?.name ? (
              <p className="mt-1 text-amber-800">Largest product: {largestProduct.name}. Add or resize a box.</p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-lg">
          <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit box" : "Add a new box"}</h2>
                <p className="text-xs text-gray-600">Use the same unit pickers as product listings for consistency.</p>
              </div>
            </div>
          </div>

          <form className="space-y-5 p-6" onSubmit={handleSubmit} noValidate>
            <div className="group transition-all duration-300 hover:translate-x-1">
              <FieldLabel htmlFor="boxName">Box name</FieldLabel>
              <input
                id="boxName"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Medium flat-rate box"
                className={FIELD_CLASS}
                required
              />
              {submitted && formErrors.name ? (
                <p className="mt-1 text-xs text-red-500 animate-pulse">{formErrors.name}</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm">
              <SectionTitle>Interior dimensions</SectionTitle>
              <p className="mt-1 text-xs text-gray-600">
                Inside measurements of the empty box. Values are checked at 95% capacity when fitting products.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["width", "Width"],
                  ["length", "Length"],
                  ["height", "Height"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label htmlFor={field} className="mb-1 block text-xs font-semibold text-gray-700">
                      {label}
                    </label>
                    <UnitNumberInput
                      id={field}
                      name={field}
                      value={form[field]}
                      unit={form.dimensionUnit}
                      units={BOX_DIMENSION_UNITS}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, [field]: value }))}
                      onUnitChange={(value) => setForm((prev) => ({ ...prev, dimensionUnit: value }))}
                      placeholder={label}
                    />
                    {submitted && formErrors[field] ? (
                      <p className="mt-1 text-xs text-red-500 animate-pulse">{formErrors[field]}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm">
              <SectionTitle>Maximum weight</SectionTitle>
              <p className="mt-1 text-xs text-gray-600">The most weight this box can safely carry, including packing materials.</p>
              <div className="mt-2 max-w-sm">
                <UnitNumberInput
                  id="maxWeight"
                  name="maxWeight"
                  value={form.maxWeight}
                  unit={form.weightUnit}
                  units={BOX_WEIGHT_UNITS}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, maxWeight: value }))}
                  onUnitChange={(value) => setForm((prev) => ({ ...prev, weightUnit: value }))}
                  placeholder="Max weight"
                />
              </div>
              {submitted && formErrors.maxWeight ? (
                <p className="mt-1 text-xs text-red-500 animate-pulse">{formErrors.maxWeight}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white shadow-md transition-all duration-300 hover:bg-orange-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Update box" : "Add box"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Your boxes</h2>
          {loading ? <p className="text-gray-600">Loading boxes...</p> : null}
          {!loading && boxes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
              No boxes yet. Add your first shipping box above.
            </div>
          ) : null}
          {boxes.map((box) => (
            <article
              key={box.id}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md ${
                editingId === box.id ? "border-orange-400 ring-2 ring-orange-100" : "border-gray-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{box.name}</h3>
                    {!box.canDelete ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        <Lock className="h-3 w-3" />
                        Required
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler className="h-4 w-4 text-orange-500" />
                      {formatBoxDimensions(box, "in")} · {formatBoxDimensions(box, "cm")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-orange-500" />
                      {formatBoxWeight(box, "lb")} · {formatBoxWeight(box, "kg")}
                    </span>
                  </div>
                  {!box.canDelete && box.deleteBlockedReason ? (
                    <p className="mt-2 text-xs text-amber-700">{box.deleteBlockedReason}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(box)}
                    className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(box)}
                    disabled={!box.canDelete || saving}
                    title={box.canDelete ? "Remove box" : box.deleteBlockedReason || "Cannot remove this box"}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <p className="mt-6 text-sm text-gray-600">
          Need to list a product? Return to{" "}
          <Link to="/inventory" className="font-medium text-orange-600 hover:underline">
            inventory
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
