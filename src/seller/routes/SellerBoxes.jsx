import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Check as CheckIcon,
  Lock,
  PenLine as EditIcon,
  Ruler,
  Scale,
  Trash2 as TrashIcon,
  X as XIcon,
} from "lucide-react";
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
  const [deletingBoxId, setDeletingBoxId] = useState(null);
  const [successBoxId, setSuccessBoxId] = useState(null);
  const [errorBoxId, setErrorBoxId] = useState(null);

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
    setErrorBoxId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (box) => {
    if (!box.canDelete || deletingBoxId) return;
    setError("");
    setMessage("");
    setErrorBoxId(null);
    setDeletingBoxId(box.id);
    try {
      await deleteSellerBox(box.id);
      setSuccessBoxId(box.id);
      if (editingId === box.id) resetForm();
      await loadBoxes();
      setTimeout(() => setSuccessBoxId(null), 2000);
    } catch (err) {
      setErrorBoxId(box.id);
      setError(err?.response?.data?.message || "Failed to delete box.");
      setTimeout(() => setErrorBoxId(null), 3000);
    } finally {
      setDeletingBoxId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <SellerNavBar pageName="Boxes" />
      <SideMenu title="Seller Menu" role="seller" />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 lg:px-[5vw]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Shipping boxes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {boxes.length} shipping box{boxes.length === 1 ? "" : "es"} configured
          </p>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Define the boxes you ship with. Products must fit inside at least one box at 95% capacity.
            {productCount > 0 ? " You must keep at least one box while products are listed." : ""}
          </p>
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
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p>
        ) : null}

        <section className="mt-6 rounded-2xl border border-orange-100 bg-white shadow-lg">
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
                placeholder="Your box name"
                className={FIELD_CLASS}
                required
              />
              {submitted && formErrors.name ? (
                <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm">
              <SectionTitle>Interior dimensions</SectionTitle>
              <p className="mt-1 text-xs text-gray-600">
                Inside measurements of the empty box. Use numbers with at most 1 decimal place. Values are checked at 95% capacity.
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
                      allowOneDecimal
                      onValueChange={(value) => setForm((prev) => ({ ...prev, [field]: value }))}
                      onUnitChange={(value) => setForm((prev) => ({ ...prev, dimensionUnit: value }))}
                      placeholder={label}
                    />
                    {submitted && formErrors[field] ? (
                      <p className="mt-1 text-xs text-red-500">{formErrors[field]}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm">
              <SectionTitle>Maximum weight</SectionTitle>
              <p className="mt-1 text-xs text-gray-600">
                The most weight this box can safely carry. Use a number with at most 1 decimal place.
              </p>
              <div className="mt-2 max-w-sm">
                <UnitNumberInput
                  id="maxWeight"
                  name="maxWeight"
                  value={form.maxWeight}
                  unit={form.weightUnit}
                  units={BOX_WEIGHT_UNITS}
                  allowOneDecimal
                  onValueChange={(value) => setForm((prev) => ({ ...prev, maxWeight: value }))}
                  onUnitChange={(value) => setForm((prev) => ({ ...prev, weightUnit: value }))}
                  placeholder="Max weight"
                />
              </div>
              {submitted && formErrors.maxWeight ? (
                <p className="mt-1 text-xs text-red-500">{formErrors.maxWeight}</p>
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

        {loading ? <p className="text-sm text-gray-600 animate-pulse">Loading shipping boxes...</p> : null}

        {!loading && boxes.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            No boxes yet. Add your first shipping box above.
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {boxes.map((box) => {
            const isDeleting = deletingBoxId === box.id;
            const isSuccess = successBoxId === box.id;
            const isError = errorBoxId === box.id;
            const canDelete = box.canDelete && !deletingBoxId;

            return (
              <article
                key={box.id}
                className={`flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-2xs ${
                  editingId === box.id ? "border-orange-400 ring-2 ring-orange-100" : "border-gray-200"
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 shadow-3xs">
                    <Box className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold text-gray-900">{box.name}</h3>
                      {!box.canDelete ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Lock className="h-3 w-3" />
                          Required
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5 text-orange-500" />
                        {formatBoxDimensions(box, "in")} · {formatBoxDimensions(box, "cm")}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-orange-500" />
                        {formatBoxWeight(box, "lb")} · {formatBoxWeight(box, "kg")}
                      </span>
                    </div>
                    {!box.canDelete && box.deleteBlockedReason ? (
                      <p className="mt-1 text-xs text-amber-700">{box.deleteBlockedReason}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(box)}
                    className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-gray-950 p-2.5 font-bold text-white shadow-xs transition-all duration-300 ease-in-out transform-gpu hover:scale-105 sm:px-4 sm:py-2"
                  >
                    <EditIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit Box</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(box)}
                    disabled={!canDelete || isSuccess || isError}
                    title={
                      isSuccess
                        ? "Removed!"
                        : isError
                        ? "Failed to remove!"
                        : box.canDelete
                        ? "Remove box"
                        : box.deleteBlockedReason || "Cannot remove this box"
                    }
                    className={`flex items-center justify-center rounded-md border p-1.5 transition-all duration-300 ${
                      isSuccess
                        ? "cursor-default border-green-500 bg-green-500 text-white"
                        : isError
                        ? "cursor-default border-red-500 bg-red-500 text-white"
                        : !canDelete
                        ? "cursor-not-allowed border-gray-200 bg-gray-200 text-gray-400"
                        : "cursor-pointer border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50"
                    }`}
                  >
                    {isDeleting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-red-400" />
                    ) : isSuccess ? (
                      <CheckIcon className="h-4 w-4 animate-pulse" />
                    ) : isError ? (
                      <XIcon className="h-4 w-4 animate-pulse" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

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
