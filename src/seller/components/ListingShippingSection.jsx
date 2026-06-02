import { useEffect, useState } from "react";
import CustomSelect from "./CustomSelect.jsx";
import {
  createSellerShippingProfile,
  getSellerShippingProfiles,
} from "../services/sellerPortalService.js";

const PROCESSING_TIME_OPTIONS = [
  { value: "1_day", label: "1 day" },
  { value: "1_2_days", label: "1-2 days" },
  { value: "1_3_days", label: "1-3 days" },
  { value: "2_4_days", label: "2-4 days" },
  { value: "3_7_days", label: "3-7 days" },
];

const SHIPPING_PRICE_OPTIONS = [
  { value: "calculated", label: "Calculate shipping price for me (Recommended)" },
  { value: "fixed", label: "I will enter a fixed shipping price" },
];

const EMPTY_PROFILE = {
  profileName: "",
  pricingMode: "calculated",
  fixedPrice: "",
  processingTime: "1_3_days",
  freeShipping: false,
};

function ShippingProfileModal({ open, onClose, onApply, initialProfile = null }) {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(initialProfile ? { ...EMPTY_PROFILE, ...initialProfile } : EMPTY_PROFILE);
    setError("");
  }, [open, initialProfile]);

  if (!open) return null;

  async function handleApply() {
    setSubmitting(true);
    setError("");
    try {
      const fixedPrice = form.pricingMode === "fixed" ? Number(form.fixedPrice) : null;
      if (form.pricingMode === "fixed" && (!Number.isFinite(fixedPrice) || fixedPrice < 0)) {
        setError("Enter a valid fixed shipping price.");
        return;
      }

      await onApply({
        id: null,
        profileName: form.profileName.trim()
          || (form.pricingMode === "fixed" ? "Fixed shipping" : "Calculated shipping"),
        pricingMode: form.pricingMode,
        fixedPrice,
        processingTime: form.processingTime,
        freeShipping: form.freeShipping,
      });
      onClose();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      setError(
        apiErrors?.profileName
        || apiErrors?.fixedPrice
        || err?.response?.data?.message
        || err?.message
        || "Could not save shipping option."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h4 className="text-lg font-bold text-gray-900">Make a new shipping option</h4>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Shipping prices</label>
            <CustomSelect
              ariaLabel="Shipping prices"
              value={form.pricingMode}
              onChange={(value) => setForm((prev) => ({ ...prev, pricingMode: value }))}
              options={SHIPPING_PRICE_OPTIONS}
            />
          </div>

          {form.pricingMode === "fixed" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Fixed shipping price (USD)</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.fixedPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, fixedPrice: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="9.99"
              />
            </label>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Processing time</label>
            <CustomSelect
              ariaLabel="Processing time"
              value={form.processingTime}
              onChange={(value) => setForm((prev) => ({ ...prev, processingTime: value }))}
              options={PROCESSING_TIME_OPTIONS}
            />
            <p className="mt-2 text-xs text-gray-500">
              A lower processing time will make your product more appealing for buyers to purchase.
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.freeShipping}
              onChange={(event) => setForm((prev) => ({ ...prev, freeShipping: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            Free shipping
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Profile name</span>
            <input
              type="text"
              value={form.profileName}
              onChange={(event) => setForm((prev) => ({ ...prev, profileName: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              placeholder={form.pricingMode === "fixed" ? "Fixed shipping" : "Calculated shipping"}
            />
            <span className="mt-1 block text-xs text-gray-500">
              This shipping option will be saved so it can be reused on future listings.
            </span>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={submitting}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save and apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ListingShippingSection({
  selectedProfileId,
  onSelectProfile,
  showErrors,
  error,
  children,
}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setLoading(true);
      try {
        const response = await getSellerShippingProfiles();
        if (!cancelled) {
          setProfiles(Array.isArray(response.profiles) ? response.profiles : []);
        }
      } catch {
        if (!cancelled) setProfiles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleApply(profile) {
    if (profile?.id) {
      onSelectProfile(profile.id, profile);
      setProfiles((prev) => {
        const exists = prev.some((entry) => entry.id === profile.id);
        return exists ? prev : [profile, ...prev];
      });
      return;
    }

    const response = await createSellerShippingProfile({
      profileName: profile.profileName,
      pricingMode: profile.pricingMode,
      fixedPrice: profile.fixedPrice,
      processingTime: profile.processingTime,
      freeShipping: profile.freeShipping,
    });
    const savedProfile = response.profile;
    onSelectProfile(savedProfile.id, savedProfile);
    setProfiles((prev) => [savedProfile, ...prev]);
  }

  const profileOptions = profiles.map((profile) => ({
    value: String(profile.id),
    label: profile.profileName,
  }));

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-semibold text-gray-700">Shipping option</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-700"
            >
              Create a new option
            </button>
            <div className="min-w-[220px]">
              <CustomSelect
                id="shippingProfileId"
                ariaLabel="Select shipping profile"
                value={selectedProfileId ? String(selectedProfileId) : ""}
                onChange={(value) => {
                  const profile = profiles.find((entry) => String(entry.id) === value);
                  onSelectProfile(Number(value), profile || null);
                }}
                placeholder={loading ? "Loading profiles..." : "Select profile"}
                options={[{ value: "", label: "Select profile" }, ...profileOptions]}
              />
            </div>
          </div>
        </div>
        {showErrors && error ? <p className="text-xs text-red-500">{error}</p> : null}
      </div>

      {children}

      <ShippingProfileModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onApply={handleApply}
      />
    </div>
  );
}
