import { useEffect, useState } from "react";
import {
  getSellerPreferences,
  updateSellerPreferences,
} from "../services/sellerPortalService.js";

export default function SellerPreferences() {
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

  useEffect(() => {
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
  }, []);

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

  return (
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
  );
}