import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Tags from "../../components/Tags.jsx";
import SearchableCustomSelect from "../components/SearchableCustomSelect.jsx";
import UnitNumberInput from "../components/UnitNumberInput.jsx";
import ListingFormSection from "../components/ListingFormSection.jsx";
import ListingVariationsSection from "../components/ListingVariationsSection.jsx";
import ListingShippingSection from "../components/ListingShippingSection.jsx";
import { LISTING_COLOR_OPTIONS } from "../constants/listingColors.js";
import { submitModelListing } from "../services/modelListingService.js";
import { compressListingPhotos } from "../../utils/compressListingPhoto.js";
import { validateProductSpecs } from "../services/productSpecsValidation.js";
import { FieldLabel, FIELD_CLASS, RequiredMark } from "../components/listingFormUi.jsx";
import {
  getFirstListingFieldError,
  scrollToListingField,
} from "../../utils/apiValidationErrors.js";

const MAX_PHOTOS = 10;
const MAX_VIDEOS = 1;
const MAX_TAGS = 10;

const ONBOARDING_ROUTE_BY_STEP = {
  shop_url: "/onboarding/stripe",
  stripe_connect: "/onboarding/stripe",
  shipping_origin: "/onboarding/shipping",
  first_box: "/boxes?new=1",
};

function fieldClassName(hasError) {
  return hasError ? `${FIELD_CLASS} border-red-500` : FIELD_CLASS;
}

function resolveOnboardingUrl(completionStep) {
  return ONBOARDING_ROUTE_BY_STEP[completionStep] || "/onboarding/stripe";
}

function mergePhotos(existingPhotos, incomingPhotos) {
  const unique = [...existingPhotos];
  const seen = new Set(existingPhotos.map((file) => `${file.name}-${file.size}-${file.lastModified}`));

  incomingPhotos.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const signature = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(file);
    }
  });

  return unique.slice(0, MAX_PHOTOS);
}

const defaultForm = {
  modelName: "",
  description: "",
  price: "",
  quantity: "1",
  modelWeight: "",
  modelWeightUnit: "lb",
  modelHeight: "",
  modelWidth: "",
  modelLength: "",
  modelDimensionUnit: "in",
  packedWeight: "",
  packedWeightUnit: "lb",
  packedHeight: "",
  packedWidth: "",
  packedLength: "",
  packedDimensionUnit: "in",
  primaryColor: "",
  secondaryColor: "",
  shippingProfileId: "",
};

export default function ListingMoreDetails({
  listingDetails,
  onBackToDetails,
  onSubmissionSuccess,
}) {
  const [form, setForm] = useState(defaultForm);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState([]);
  const [variations, setVariations] = useState([]);
  const [tags, setTags] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [serverErrors, setServerErrors] = useState({});
  const [onboardingUrl, setOnboardingUrl] = useState(null);
  const [boxesUrl, setBoxesUrl] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoProcessingError, setPhotoProcessingError] = useState("");
  const isPhysical = listingDetails?.itemType === "physical";

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => {
    const urls = videos.map((file) => URL.createObjectURL(file));
    setVideoPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [videos]);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (photos.length === 0) {
      nextErrors.photos = "Upload at least one photo.";
    } else if (photos.length > MAX_PHOTOS) {
      nextErrors.photos = `You can upload up to ${MAX_PHOTOS} photos.`;
    }

    const trimmedTitle = form.modelName.trim();
    if (trimmedTitle.length < 1) {
      nextErrors.modelName = "Title must be at least 1 character.";
    } else if (trimmedTitle.length > 120) {
      nextErrors.modelName = "Title must be at most 120 characters.";
    } else if (!/^[a-zA-Z0-9 ]+$/.test(trimmedTitle)) {
      nextErrors.modelName = "Title can only contain letters, numbers, and spaces.";
    }

    if (form.description.trim().length < 20) {
      nextErrors.description = "Description must be at least 20 characters.";
    }

    const parsedPrice = Number(form.price);
    if (!form.price || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      nextErrors.price = "Enter a valid price greater than 0.";
    }

    const parsedQuantity = Number(form.quantity);
    if (
      !form.quantity
      || Number.isNaN(parsedQuantity)
      || parsedQuantity <= 0
      || !Number.isInteger(parsedQuantity)
    ) {
      nextErrors.quantity = "Enter a valid whole number quantity greater than 0.";
    }

    if (tags.length > MAX_TAGS) {
      nextErrors.tags = `You can add up to ${MAX_TAGS} tags.`;
    }

    if (isPhysical) {
      Object.assign(nextErrors, validateProductSpecs(form));

      const packedErrors = validateProductSpecs({
        modelWeight: form.packedWeight,
        modelWeightUnit: form.packedWeightUnit,
        modelHeight: form.packedHeight,
        modelWidth: form.packedWidth,
        modelLength: form.packedLength,
        modelDimensionUnit: form.packedDimensionUnit,
        daysToPrepare: "1",
      });
      if (packedErrors.modelWeight) nextErrors.packedWeight = packedErrors.modelWeight;
      if (packedErrors.modelHeight) nextErrors.packedHeight = packedErrors.modelHeight;
      if (packedErrors.modelWidth) nextErrors.packedWidth = packedErrors.modelWidth;
      if (packedErrors.modelLength) nextErrors.packedLength = packedErrors.modelLength;
      if (!form.shippingProfileId) {
        nextErrors.shippingProfileId = "Select a shipping profile.";
      }
    }

    return nextErrors;
  }, [form, photos, tags, isPhysical]);

  const displayErrors = useMemo(
    () => ({ ...errors, ...serverErrors }),
    [errors, serverErrors]
  );
  const isFormValid = Object.keys(errors).length === 0;

  useEffect(() => {
    if (!submitted) return;
    const firstErrorField = getFirstListingFieldError(displayErrors);
    if (firstErrorField) scrollToListingField(firstErrorField);
  }, [submitted, displayErrors]);

  function clearServerError(field) {
    setServerErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    clearServerError(name);
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleUnitChange(field, value) {
    clearServerError(field.replace("Unit", ""));
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function addPhotos(incomingPhotos) {
    if (!incomingPhotos.length) return;
    clearServerError("photos");
    setPhotoProcessingError("");
    setIsProcessingPhotos(true);
    try {
      const optimizedPhotos = await compressListingPhotos(incomingPhotos);
      if (optimizedPhotos.length === 0) {
        setPhotoProcessingError("Only image files can be uploaded.");
        return;
      }
      setPhotos((prev) => mergePhotos(prev, optimizedPhotos));
    } catch {
      setPhotoProcessingError("We couldn't prepare one of your photos. Try a different image.");
    } finally {
      setIsProcessingPhotos(false);
    }
  }

  function handlePhotoChange(event) {
    void addPhotos(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function handleVideoChange(event) {
    const incoming = Array.from(event.target.files || []).filter((file) => file.type.startsWith("video/"));
    if (incoming.length === 0) return;
    setVideos(incoming.slice(0, MAX_VIDEOS));
    event.target.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setSubmitMessage("");
    setServerErrors({});
    setOnboardingUrl(null);
    setBoxesUrl(null);

    if (isProcessingPhotos) {
      setSubmitMessage("Please wait while your photos finish optimizing.");
      return;
    }
    if (!isFormValid) return;

    try {
      setIsSubmitting(true);
      const response = await submitModelListing({
        modelName: form.modelName,
        description: form.description,
        price: Number(form.price),
        category: listingDetails?.category,
        tags,
        quantity: Number(form.quantity),
        modelWeight: form.modelWeight,
        modelWeightUnit: form.modelWeightUnit,
        modelHeight: form.modelHeight,
        modelWidth: form.modelWidth,
        modelLength: form.modelLength,
        modelDimensionUnit: form.modelDimensionUnit,
        packedWeight: form.packedWeight,
        packedWeightUnit: form.packedWeightUnit,
        packedHeight: form.packedHeight,
        packedWidth: form.packedWidth,
        packedLength: form.packedLength,
        packedDimensionUnit: form.packedDimensionUnit,
        itemType: listingDetails?.itemType,
        madeBy: listingDetails?.madeBy,
        itemKind: listingDetails?.itemKind,
        materialType: listingDetails?.materialType,
        aiUsed: listingDetails?.aiUsed,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        variations,
        shippingProfileId: form.shippingProfileId ? Number(form.shippingProfileId) : null,
        photos,
        videos,
      });

      setSubmitMessage(response?.message || "Your listing is ready.");
      setForm(defaultForm);
      setPhotos([]);
      setVideos([]);
      setVariations([]);
      setTags([]);
      setSubmitted(false);
      onSubmissionSuccess?.();
    } catch (error) {
      const nextFieldErrors = error?.fieldErrors && typeof error.fieldErrors === "object"
        ? error.fieldErrors
        : {};
      if (Object.keys(nextFieldErrors).length > 0) {
        setServerErrors(nextFieldErrors);
      } else if (error?.message) {
        setServerErrors({ general: error.message });
      }
      setSubmitted(true);
      setSubmitMessage(error?.message || "Failed to prepare listing. Please try again.");
      setBoxesUrl(error?.boxesUrl || null);
      setOnboardingUrl(error?.completionStep ? resolveOnboardingUrl(error.completionStep) : null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Item details saved</p>
          <p className="truncate text-xs text-gray-600">
            {listingDetails?.category}
            {isPhysical ? ` · ${listingDetails?.materialType}` : " · Digital file"}
          </p>
        </div>
        {onBackToDetails ? (
          <button
            type="button"
            onClick={onBackToDetails}
            className="shrink-0 text-sm font-semibold text-orange-700 hover:text-orange-800"
          >
            Edit details
          </button>
        ) : null}
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add more details</h2>
          <p className="mt-1 text-sm text-gray-600">
            Finish your listing with photos, pricing, attributes, and shipping details.
          </p>
        </div>

        {submitted && displayErrors.general ? (
          <p id="listing-general-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {displayErrors.general}
          </p>
        ) : null}

        <ListingFormSection title="Title">
          <FieldLabel htmlFor="modelName">Title</FieldLabel>
          <input
            id="modelName"
            name="modelName"
            type="text"
            maxLength={120}
            value={form.modelName}
            onChange={handleChange}
            placeholder="Name your listing"
            className={fieldClassName(submitted && displayErrors.modelName)}
          />
          <p className="mt-1 text-xs text-gray-500">{form.modelName.trim().length}/120 characters</p>
          {submitted && displayErrors.modelName ? (
            <p className="mt-1 text-xs text-red-500">{displayErrors.modelName}</p>
          ) : null}
        </ListingFormSection>

        <ListingFormSection
          title="Photos and video"
          description="The first image you select is your thumbnail and main photo — choose it wisely."
        >
          <label
            htmlFor="modelPhotos"
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              void addPhotos(Array.from(event.dataTransfer.files || []));
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
              isDragActive
                ? "border-orange-500 bg-orange-100"
                : "border-orange-200 bg-orange-50/60 hover:border-orange-400"
            } ${isProcessingPhotos ? "pointer-events-none opacity-70" : ""}`}
          >
            <span className="text-sm font-medium text-gray-700">
              {isProcessingPhotos ? "Optimizing photos..." : "Drag and drop images here, or click to upload"}
            </span>
            <span className="mt-1 text-xs text-gray-500">Up to {MAX_PHOTOS} photos</span>
          </label>
          <input id="modelPhotos" type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />

          {photoProcessingError ? <p className="mt-2 text-xs text-red-500">{photoProcessingError}</p> : null}
          {submitted && displayErrors.photos ? <p className="mt-2 text-xs text-red-500">{displayErrors.photos}</p> : null}

          {previewUrls.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {previewUrls.map((url, index) => (
                <div key={url} className="relative overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm">
                  {index === 0 ? (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Main
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index))}
                    className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-sm font-bold text-gray-600"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    ×
                  </button>
                  <img src={url} alt={`Listing preview ${index + 1}`} className="h-24 w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <label htmlFor="listingVideo" className="mb-2 block text-sm font-semibold text-gray-700">
              Video (optional)
            </label>
            <input id="listingVideo" type="file" accept="video/*" onChange={handleVideoChange} className="block w-full text-sm text-gray-600" />
            {videoPreviewUrls[0] ? (
              <video src={videoPreviewUrls[0]} controls className="mt-3 max-h-48 w-full rounded-xl border border-gray-200" />
            ) : null}
          </div>
        </ListingFormSection>

        <ListingFormSection title="Description">
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your item, print settings, and use cases..."
            className={`${fieldClassName(submitted && displayErrors.description)} resize-none`}
          />
          {submitted && displayErrors.description ? (
            <p className="mt-1 text-xs text-red-500">{displayErrors.description}</p>
          ) : null}
        </ListingFormSection>

        <ListingFormSection title="Inventory and pricing">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="price">Price (USD)</FieldLabel>
              <input
                id="price"
                name="price"
                type="text"
                value={form.price}
                onChange={handleChange}
                placeholder="19.99"
                className={fieldClassName(submitted && displayErrors.price)}
              />
              {submitted && displayErrors.price ? (
                <p className="mt-1 text-xs text-red-500">{displayErrors.price}</p>
              ) : null}
            </div>
            <div>
              <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={handleChange}
                className={`${fieldClassName(submitted && displayErrors.quantity)} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              {submitted && displayErrors.quantity ? (
                <p className="mt-1 text-xs text-red-500">{displayErrors.quantity}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-5">
            <ListingVariationsSection
              variations={variations}
              onChange={setVariations}
              showErrors={submitted}
              error={displayErrors.variations}
            />
          </div>
        </ListingFormSection>

        <ListingFormSection title="Attributes and types">
          {isPhysical ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="primaryColor" required={false}>Primary color</FieldLabel>
                  <SearchableCustomSelect
                    id="primaryColor"
                    value={form.primaryColor}
                    onChange={(value) => setForm((prev) => ({ ...prev, primaryColor: value }))}
                    placeholder="Select primary color"
                    searchPlaceholder="Search colors..."
                    ariaLabel="Primary color"
                    options={LISTING_COLOR_OPTIONS}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="secondaryColor" required={false}>Secondary color</FieldLabel>
                  <SearchableCustomSelect
                    id="secondaryColor"
                    value={form.secondaryColor}
                    onChange={(value) => setForm((prev) => ({ ...prev, secondaryColor: value }))}
                    placeholder="Select secondary color"
                    searchPlaceholder="Search colors..."
                    ariaLabel="Secondary color"
                    options={LISTING_COLOR_OPTIONS}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["modelHeight", "Height"],
                  ["modelWidth", "Width"],
                  ["modelLength", "Length"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label htmlFor={field} className="mb-1 block text-xs font-semibold text-gray-700">
                      {label} <RequiredMark />
                    </label>
                    <UnitNumberInput
                      id={field}
                      name={field}
                      value={form[field]}
                      unit={form.modelDimensionUnit}
                      units={[
                        { value: "in", label: "in" },
                        { value: "cm", label: "cm" },
                      ]}
                      allowOneDecimal
                      onValueChange={(value) => setForm((prev) => ({ ...prev, [field]: value }))}
                      onUnitChange={(value) => handleUnitChange("modelDimensionUnit", value)}
                      placeholder={label}
                    />
                    {submitted && displayErrors[field] ? (
                      <p className="mt-1 text-xs text-red-500">{displayErrors[field]}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Physical dimensions and color attributes are only required for physical items.
            </p>
          )}
        </ListingFormSection>

        <ListingFormSection title="Tags">
          <Tags
            tags={tags}
            maxTags={MAX_TAGS}
            setTags={(updater) =>
              setTags((prev) => (typeof updater === "function" ? updater(prev) : updater))
            }
          />
          {submitted && displayErrors.tags ? (
            <p className="mt-1 text-xs text-red-500">{displayErrors.tags}</p>
          ) : null}
        </ListingFormSection>

        {isPhysical ? (
          <ListingFormSection title="Shipping">
            <ListingShippingSection
              selectedProfileId={form.shippingProfileId}
              onSelectProfile={(profileId) => {
                clearServerError("shippingProfileId");
                setForm((prev) => ({ ...prev, shippingProfileId: profileId }));
              }}
              showErrors={submitted}
              error={displayErrors.shippingProfileId}
            >
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Item weight</label>
                  <UnitNumberInput
                    id="packedWeight"
                    name="packedWeight"
                    value={form.packedWeight}
                    unit={form.packedWeightUnit}
                    units={[
                      { value: "lb", label: "lb" },
                      { value: "kg", label: "kg" },
                    ]}
                    allowOneDecimal
                    onValueChange={(value) => setForm((prev) => ({ ...prev, packedWeight: value }))}
                    onUnitChange={(value) => handleUnitChange("packedWeightUnit", value)}
                    placeholder="Weight"
                  />
                  {submitted && displayErrors.packedWeight ? (
                    <p className="mt-1 text-xs text-red-500">{displayErrors.packedWeight}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Item size (when packed)</label>
                  <p className="mb-2 text-xs text-gray-500">When item is just prepared (not inside the shipping box yet).</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      ["packedHeight", "Height"],
                      ["packedWidth", "Width"],
                      ["packedLength", "Length"],
                    ].map(([field, label]) => (
                      <UnitNumberInput
                        key={field}
                        id={field}
                        name={field}
                        value={form[field]}
                        unit={form.packedDimensionUnit}
                        units={[
                          { value: "in", label: "in" },
                          { value: "cm", label: "cm" },
                        ]}
                        allowOneDecimal
                        onValueChange={(value) => setForm((prev) => ({ ...prev, [field]: value }))}
                        onUnitChange={(value) => handleUnitChange("packedDimensionUnit", value)}
                        placeholder={label}
                      />
                    ))}
                  </div>
                  {submitted && (displayErrors.packedHeight || displayErrors.packedWidth || displayErrors.packedLength) ? (
                    <p className="mt-1 text-xs text-red-500">
                      {displayErrors.packedHeight || displayErrors.packedWidth || displayErrors.packedLength}
                    </p>
                  ) : null}
                </div>
              </div>
            </ListingShippingSection>
          </ListingFormSection>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isProcessingPhotos}
            className="rounded-xl bg-orange-500 px-8 py-3 font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {isSubmitting ? "Saving listing..." : "Save and continue"}
          </button>
        </div>

        {submitMessage ? (
          <p
            role="alert"
            className={`rounded-lg border px-4 py-3 text-sm ${
              Object.keys(serverErrors).length > 0
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-orange-200 bg-orange-50 text-gray-700"
            }`}
          >
            {submitMessage}
            {onboardingUrl ? (
              <>
                {" "}
                <Link to={onboardingUrl} className="font-semibold text-orange-600 hover:text-orange-700">
                  Continue Stripe Connect setup
                </Link>
              </>
            ) : null}
            {boxesUrl ? (
              <>
                {" "}
                <Link to={boxesUrl} className="font-semibold text-orange-600 hover:text-orange-700">
                  Add a shipping box
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </form>
    </div>
  );
}
