import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import {PenLine as EditIcon} from "lucide-react";
import {
  getSellerPreferences,
  updateSellerPreferences,
  uploadSellerProfileImage,
} from "../services/sellerPortalService.js";

const PRINTER_OPTIONS = [
  { value: "", label: "Select specialization" },
  { value: "fdm", label: "FDM (Filament)" },
  { value: "sla", label: "SLA (Resin)" },
  { value: "both", label: "Both" },
];
const DESIGN_SOFTWARE_OPTIONS = ["Blender", "Fusion360", "ZBrush", "SolidWorks", "Onshape", "Other"];
const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function loadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = imageUrl;
  });
}

async function getCroppedImageBlob(imageUrl, cropPixels) {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Failed to crop image."));
    }, "image/jpeg", 0.92);
  });
}

export default function SellerPreferences() {
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [preferencesError, setPreferencesError] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [selectedImageName, setSelectedImageName] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);
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
    sellerAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
      residential: true,
    },
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

  useEffect(() => {
    if (!selectedImageUrl) return undefined;
    return () => {
      URL.revokeObjectURL(selectedImageUrl);
    };
  }, [selectedImageUrl]);

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
      setPreferencesForm((prev) => ({
        ...prev,
        ...response.preferences,
        ...response.sellerProfile,
      }));
      setPreferencesMessage(response?.message || "Preferences updated.");
    } catch (error) {
      setPreferencesError(error?.response?.data?.message || "Failed to update preferences.");
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    setImageError("");
    setPreferencesMessage("");

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Choose an image file.");
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setImageError("Profile image must be 5MB or less.");
      return;
    }

    setSelectedImageName(file.name);
    setSelectedImageUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    event.target.value = "";
  };

  const onCropComplete = useCallback((_, nextCroppedAreaPixels) => {
    setCroppedAreaPixels(nextCroppedAreaPixels);
  }, []);

  const handleUploadCroppedImage = async () => {
    setImageError("");
    setPreferencesMessage("");

    if (!selectedImageUrl || !croppedAreaPixels) {
      setImageError("Choose and crop an image before uploading.");
      return;
    }

    try {
      setImageUploading(true);
      const croppedBlob = await getCroppedImageBlob(selectedImageUrl, croppedAreaPixels);
      const baseName = (selectedImageName || "profile-image").replace(/\.[^.]+$/, "") || "profile-image";
      const croppedFile = new File([croppedBlob], `${baseName}-cropped.jpg`, { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("profileImage", croppedFile);

      const response = await uploadSellerProfileImage(formData);
      updateField("shopLogoUrl", response.imageUrl || "");
      setPreferencesMessage(response?.message || "Profile image saved.");
      setSelectedImageUrl("");
      setSelectedImageName("");
      setCroppedAreaPixels(null);
    } catch (error) {
      setImageError(error?.response?.data?.message || error?.message || "Failed to upload profile image.");
    } finally {
      setImageUploading(false);
    }
  };

  const updateField = (field, value) => {
    setPreferencesForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSellerAddressField = (field, value) => {
    setPreferencesForm((prev) => ({
      ...prev,
      sellerAddress: {
        ...(prev.sellerAddress || {}),
        [field]: field === "state" || field === "country" ? value.toUpperCase() : value,
      },
    }));
  };

  const openImagePicker = () => {
    fileInputRef.current?.click();
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
    <section className="min-h-screen bg-[#f2f2f2]">
      <SellerNavBar pageName={"Preferences"}/>
      <SideMenu role={"seller"} title={"Seller Options"}/>
      <div className="mx-auto max-w-4xl px-4 pb-12 pt-24">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-bold text-gray-900">Seller Preferences</h2>
        <p className="mt-1 text-sm text-gray-600">Control storefront details and seller notifications.</p>

        {preferencesMessage ? <p className="mt-3 text-sm text-green-700">{preferencesMessage}</p> : null}
        {preferencesError ? <p className="mt-3 text-sm text-red-600">{preferencesError}</p> : null}
        {preferencesLoading ? <p className="mt-3 text-sm text-gray-600">Loading preferences...</p> : null}

        <form className="mt-4 space-y-4" onSubmit={handleSavePreferences}>
          <div className="flex flex-col items-center">
            <p className="mb-2 text-sm font-semibold text-gray-700">Avatar</p>
            <button
              type="button"
              onClick={openImagePicker}
              className="group relative h-36 w-36 overflow-hidden rounded-full border border-gray-200 bg-gray-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
              aria-label="Change avatar"
            >
              {preferencesForm.shopLogoUrl ? (
                <img
                  src={preferencesForm.shopLogoUrl}
                  alt="Current shop avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                  Avatar
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100 group-focus-visible:bg-black/45 group-focus-visible:opacity-100">
                <EditIcon size={34} strokeWidth={2.3} />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {selectedImageUrl ? (
              <div className="mt-4 w-full max-w-md space-y-3">
                <div className="relative h-72 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <Cropper
                    image={selectedImageUrl}
                    crop={crop}
                    zoom={zoom}
                    minZoom={1}
                    maxZoom={3}
                    zoomSpeed={0.08}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>
                <label className="block text-sm font-semibold text-gray-700">
                  Zoom
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step="any"
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="mt-2 w-full cursor-pointer accent-gray-900"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUploadCroppedImage}
                  disabled={imageUploading}
                  className="rounded-lg border border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-60"
                >
                  {imageUploading ? "Saving..." : "Save"}
                </button>
              </div>
            ) : null}
            {imageError ? <p className="mt-2 text-sm text-red-600">{imageError}</p> : null}
          </div>

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

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">Fulfillment Address</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Street Address</label>
                <input
                  value={preferencesForm.sellerAddress?.line1 || ""}
                  onChange={(event) => updateSellerAddressField("line1", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                  placeholder="123 Main St"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Apt, suite, etc.</label>
                <input
                  value={preferencesForm.sellerAddress?.line2 || ""}
                  onChange={(event) => updateSellerAddressField("line2", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">City</label>
                <input
                  value={preferencesForm.sellerAddress?.city || ""}
                  onChange={(event) => updateSellerAddressField("city", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">State</label>
                <input
                  value={preferencesForm.sellerAddress?.state || ""}
                  onChange={(event) => updateSellerAddressField("state", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                  maxLength={2}
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">ZIP Code</label>
                <input
                  value={preferencesForm.sellerAddress?.zip || ""}
                  onChange={(event) => updateSellerAddressField("zip", event.target.value.trimStart())}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                  placeholder="94107"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Country</label>
                <input
                  value={preferencesForm.sellerAddress?.country || "US"}
                  onChange={(event) => updateSellerAddressField("country", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                  maxLength={2}
                />
              </div>
            </div>
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
      </div>
    </section>
  );
}
