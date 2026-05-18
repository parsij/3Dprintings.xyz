import { useEffect, useState } from "react";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import {
  getSellerPreferences,
  updateSellerPreferences,
} from "../services/sellerPortalService.js";

const PRINTER_OPTIONS = [
  { value: "", label: "Select specialization" },
  { value: "fdm", label: "FDM (Filament)" },
  { value: "sla", label: "SLA (Resin)" },
  { value: "both", label: "Both" },
];
const DESIGN_SOFTWARE_OPTIONS = ["Blender", "Fusion360", "ZBrush", "SolidWorks", "Onshape", "Other"];

export default function SellerPreferences() {
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesForm, setPreferencesForm] = useState({
    storeName: "",
    supportEmail: "",
    storeDescription: "",
    shopName: "",
    shopBio: "",
    shopLogoUrl: "",
    primaryPrinterSpecialization: "",
    designSoftware: [],
    externalPortfolioLink: "",
    intellectualPropertyCertified: false,
    termsOfServiceAccepted: false,
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
          ...response.sellerProfile,
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
      const response = await updateSellerPreferences({
        ...preferencesForm,
        storeName: preferencesForm.shopName,
        storeDescription: preferencesForm.shopBio,
      });
      setPreferencesMessage(response?.message || "Preferences updated.");
    } catch (error) {
      setPreferencesError(error?.response?.data?.message || "Failed to update preferences.");
    } finally {
      setPreferencesSaving(false);
    }
  };

  const updateField = (field, value) => {
    setPreferencesForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDesignSoftware = (software) => {
    setPreferencesForm((prev) => {
      const current = Array.isArray(prev.designSoftware) ? prev.designSoftware : [];
      const next = current.includes(software)
        ? current.filter((item) => item !== software)
        : [...current, software];
      return { ...prev, designSoftware: next };
    });
  };

  return (
    <section className="max-w-4xl m-20">
      <SellerNavBar pageName={"Preferences"}/>
      <SideMenu role={"seller"} title={"Seller Options"}/>
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-bold text-gray-900">Seller Preferences</h2>
        <p className="mt-1 text-sm text-gray-600">Control storefront details and seller notifications.</p>

        {preferencesMessage ? <p className="mt-3 text-sm text-green-700">{preferencesMessage}</p> : null}
        {preferencesError ? <p className="mt-3 text-sm text-red-600">{preferencesError}</p> : null}
        {preferencesLoading ? <p className="mt-3 text-sm text-gray-600">Loading preferences...</p> : null}

        <form className="mt-4 space-y-4" onSubmit={handleSavePreferences}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Shop Name <span className="text-red-600">*</span>
              </label>
              <input
                required
                value={preferencesForm.shopName}
                onChange={(event) => updateField("shopName", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_ ]+"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Primary Printer Specialization <span className="text-red-600">*</span>
              </label>
              <select
                required
                value={preferencesForm.primaryPrinterSpecialization}
                onChange={(event) => updateField("primaryPrinterSpecialization", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
              >
                {PRINTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Shop Bio / Description</label>
            <textarea
              rows={4}
              value={preferencesForm.shopBio}
              onChange={(event) => updateField("shopBio", event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              maxLength={500}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Shop Logo / Avatar URL</label>
              <input
                value={preferencesForm.shopLogoUrl}
                onChange={(event) => updateField("shopLogoUrl", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="https://example.com/logo.webp"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">External Portfolio Link</label>
              <input
                type="url"
                value={preferencesForm.externalPortfolioLink}
                onChange={(event) => updateField("externalPortfolioLink", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="https://printables.com/@shop"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 block text-sm font-semibold text-gray-700">Design Software of Choice</p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {DESIGN_SOFTWARE_OPTIONS.map((software) => (
                <label key={software} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={(preferencesForm.designSoftware || []).includes(software)}
                    onChange={() => toggleDesignSoftware(software)}
                  />
                  {software}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Support Email</label>
            <input
              type="email"
              value={preferencesForm.supportEmail}
              onChange={(event) => updateField("supportEmail", event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={preferencesForm.notifyNewOrders}
                onChange={(event) => updateField("notifyNewOrders", event.target.checked)}
              />
              Email on new orders
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={preferencesForm.notifyNewReviews}
                onChange={(event) => updateField("notifyNewReviews", event.target.checked)}
              />
              Email on new reviews
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={preferencesForm.notifyPayouts}
                onChange={(event) => updateField("notifyPayouts", event.target.checked)}
              />
              Email on payout updates
            </label>
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-4">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                required
                type="checkbox"
                checked={preferencesForm.intellectualPropertyCertified}
                onChange={(event) => updateField("intellectualPropertyCertified", event.target.checked)}
                className="mt-1"
              />
              <span>I certify that I own or have commercial rights to all files I upload. <span className="text-red-600">*</span></span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                required
                type="checkbox"
                checked={preferencesForm.termsOfServiceAccepted}
                onChange={(event) => updateField("termsOfServiceAccepted", event.target.checked)}
                className="mt-1"
              />
              <span>I accept the platform creator terms of service. <span className="text-red-600">*</span></span>
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
