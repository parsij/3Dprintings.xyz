import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
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
};

export default function SellerBoxes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [boxes, setBoxes] = useState([]);
  const [coversLargestProduct, setCoversLargestProduct] = useState(true);
  const [form, setForm] = useState(EMPTY_BOX);
  const [editingId, setEditingId] = useState(null);

  const loadBoxes = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSellerBoxes();
      setBoxes(Array.isArray(data.boxes) ? data.boxes : []);
      setCoversLargestProduct(data.coversLargestProduct !== false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load boxes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoxes();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_BOX);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await updateSellerBox(editingId, form);
        setMessage("Box updated.");
      } else {
        await createSellerBox(form);
        setMessage("Box added.");
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
    setForm({
      name: box.name,
      width: String(box.widthMm),
      length: String(box.lengthMm),
      height: String(box.heightMm),
      maxWeight: String(box.maxWeightG),
    });
  };

  const handleDelete = async (boxId) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteSellerBox(boxId);
      setMessage("Box removed.");
      if (editingId === boxId) resetForm();
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
        <h1 className="text-2xl font-bold text-gray-900">Shipping boxes</h1>
        <p className="mt-2 text-sm text-gray-600">
          Keep at least one box. Boxes are checked at 95% capacity to ensure your largest product still fits.
        </p>

        {!coversLargestProduct ? (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your current boxes do not fit your largest product. Add or update a box.
          </p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}

        <section className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit box" : "Add box"}</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Box name"
              className="sm:col-span-2 rounded-xl border border-gray-300 px-4 py-3"
              required
            />
            {["width", "length", "height", "maxWeight"].map((field) => (
              <input
                key={field}
                type="number"
                min="0.01"
                step="0.01"
                value={form[field]}
                onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                placeholder={field}
                className="rounded-xl border border-gray-300 px-4 py-3"
                required
              />
            ))}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-400 disabled:opacity-60"
              >
                {editingId ? "Update box" : "Add box"}
              </button>
              {editingId ? (
                <button type="button" onClick={resetForm} className="rounded-xl border border-gray-300 px-5 py-3">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="mt-6 space-y-3">
          {loading ? <p className="text-gray-600">Loading boxes...</p> : null}
          {!loading && boxes.length === 0 ? (
            <p className="text-sm text-gray-600">No boxes yet. Add your first box above.</p>
          ) : null}
          {boxes.map((box) => (
            <article key={box.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{box.name}</h3>
                  <p className="text-sm text-gray-600">
                    {box.widthMm} × {box.lengthMm} × {box.heightMm} mm · max {box.maxWeightG} g
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleEdit(box)} className="text-sm font-medium text-orange-600">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(box.id)}
                    disabled={boxes.length <= 1 || saving}
                    className="text-sm font-medium text-red-600 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <p className="mt-6 text-sm text-gray-600">
          Need to list a product? Return to <Link to="/inventory" className="font-medium text-orange-600 hover:underline">inventory</Link>.
        </p>
      </main>
    </div>
  );
}
