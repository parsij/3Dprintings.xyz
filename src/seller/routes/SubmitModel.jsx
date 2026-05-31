import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { submitModelListing } from "../services/modelListingService.js";
import Tags from "../../components/Tags.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import ProductSpecsFields from "../components/ProductSpecsFields.jsx";
import { validateProductSpecs } from "../services/productSpecsValidation.js";
import { compressListingPhotos } from "../../utils/compressListingPhoto.js";
import { FieldLabel, FIELD_CLASS, RequiredMark } from "../components/listingFormUi.jsx";
import {
  getFirstListingFieldError,
  scrollToListingField,
} from "../../utils/apiValidationErrors.js";

function fieldClassName(hasError) {
  return hasError ? `${FIELD_CLASS} border-red-500` : FIELD_CLASS;
}

// Your complete, community-specific 3D printing taxonomy
// eslint-disable-next-line react-refresh/only-export-components
export const CATEGORY_DATA = [
  {
    title: "3D Printer Parts & Upgrades",
    slug: "3d-printer-parts",
    subcategories: [
      { label: "Extruder & Hotend Mods", slug: "extruder-hotend" },
      { label: "Cooling Fan Ducts", slug: "fan-ducts" },
      { label: "Bed Leveling Mounts & Spacers", slug: "bed-leveling" },
      { label: "Spool Holders & Filament Guides", slug: "spool-holders" },
      { label: "Enclosure Parts & Vents", slug: "enclosures" },
      { label: "Printer Tool Holders & Trays", slug: "tool-holders" },
      { label: "Cable Management Chains", slug: "cable-chains" },
      { label: "Other 3D Printer Parts & Upgrades", slug: "other-printer-parts" }
    ]
  },
  {
    title: "Functional Parts & Hardware",
    slug: "functional-hardware",
    subcategories: [
      { label: "Adapters & Converters", slug: "adapters-converters" },
      { label: "Brackets & Mounts", slug: "brackets-mounts" },
      { label: "Hooks & Hangers", slug: "hooks-hangers" },
      { label: "Hinges, Clasps & Joints", slug: "hinges-joints" },
      { label: "Knobs, Dials & Handles", slug: "knobs-handles" },
      { label: "Spacers, Washers & Shims", slug: "spacers-washers" },
      { label: "Replacement Appliance Parts", slug: "replacement-parts" },
      { label: "Other Functional Parts & Hardware", slug: "other-functional" }
    ]
  },
  {
    title: "Toys & Play",
    slug: "toys-play",
    subcategories: [
      { label: "Articulated & Flexi Toys", slug: "articulated-flexi" },
      { label: "Multicolor & Multi-material Models", slug: "multicolor" },
      { label: "Fidget Toys & Spinners", slug: "fidget-toys" },
      { label: "Action Figures & Mechs", slug: "action-figures" },
      { label: "Puzzles & Brain Teasers", slug: "puzzles" },
      { label: "Dollhouse & Miniatures", slug: "dollhouse-miniatures" },
      { label: "Vehicles (Cars, Planes, Boats)", slug: "toy-vehicles" },
      { label: "Other Toys & Play", slug: "other-toys" }
    ]
  },
  {
    title: "Tabletop & Board Games",
    slug: "tabletop-board-games",
    subcategories: [
      { label: "Tabletop RPG Miniatures", slug: "rpg-miniatures" },
      { label: "Terrain & Scenery Set Pieces", slug: "terrain-scenery" },
      { label: "Dice Towers & Storage Boxes", slug: "dice-towers" },
      { label: "Board Game Inserts & Organizers", slug: "board-game-inserts" },
      { label: "Card Holders & Deck Boxes", slug: "deck-boxes" },
      { label: "Tokens, Trackers & Coins", slug: "tokens-trackers" },
      { label: "Other Tabletop & Board Games", slug: "other-tabletop" }
    ]
  },
  {
    title: "Tech & Gadget Accessories",
    slug: "tech-gadgets",
    subcategories: [
      { label: "Phone & Tablet Stands", slug: "phone-stands" },
      { label: "Laptop Mounts & Monitor Risers", slug: "laptop-mounts" },
      { label: "Controller & Headphone Stands", slug: "controller-stands" },
      { label: "Cable Clips & Desk Routing", slug: "cable-clips" },
      { label: "Smart Home Device Mounts", slug: "smart-home-mounts" },
      { label: "SD Card & USB Drive Organizers", slug: "sd-usb-organizers" },
      { label: "Other Tech & Gadget Accessories", slug: "other-tech" }
    ]
  },
  {
    title: "Home & Office Organizers",
    slug: "home-office",
    subcategories: [
      { label: "Vases & Plant Pots", slug: "vases-planters" },
      { label: "Desk Organizers & Pen Holders", slug: "desk-organizers" },
      { label: "Bathroom & Kitchen Accessories", slug: "kitchen-bath" },
      { label: "Pegboard Accessories & Hooks", slug: "pegboard" },
      { label: "Keychains & Bag Tags", slug: "keychains" },
      { label: "Custom Lithophanes & Lighting", slug: "lithophanes" },
      { label: "Other Home & Office Organizers", slug: "other-home-office" }
    ]
  },
  {
    title: "RC, Drones & Robotics",
    slug: "rc-robotics",
    subcategories: [
      { label: "RC Car Chassis & Upgrades", slug: "rc-upgrades" },
      { label: "Drone Frames & Camera Mounts", slug: "drone-frames" },
      { label: "Microcontroller & Pi Cases", slug: "pi-cases" },
      { label: "Gears, Racks & Pinions", slug: "gears-racks" },
      { label: "Other RC, Drones & Robotics", slug: "other-robotics" }
    ]
  },
  {
    title: "Props & Cosplay",
    slug: "props-cosplay",
    subcategories: [
      { label: "Helmets & Masks", slug: "helmets-masks" },
      { label: "Armor Pieces", slug: "armor-pieces" },
      { label: "Weapon Replicas", slug: "weapon-replicas" },
      { label: "Costume Jewelry & Wearables", slug: "wearables" },
      { label: "Other Props & Cosplay", slug: "other-cosplay" }
    ]
  },
  {
    title: "Miscellaneous",
    slug: "miscellaneous",
    subcategories: [
      { label: "Other", slug: "other" }
    ]
  }
];

const defaultForm = {
  modelName: "",
  description: "",
  price: "",
  category: "",
  tags: [],
  quantity: "1",
  modelWeight: "",
  modelWeightUnit: "lb",
  modelHeight: "",
  modelWidth: "",
  modelLength: "",
  modelDimensionUnit: "in",
  daysToPrepare: "1",
};

const ONBOARDING_ROUTE_BY_STEP = {
  shop_url: "/onboarding/stripe",
  stripe_connect: "/onboarding/stripe",
  shipping_origin: "/onboarding/shipping",
  first_box: "/boxes?new=1",
};

const MAX_PHOTOS = 10;

function resolveOnboardingUrl(completionStep) {
  return ONBOARDING_ROUTE_BY_STEP[completionStep] || "/onboarding/stripe";
}

const categoryGroups = CATEGORY_DATA.map((group) => ({
  label: group.title,
  options: group.subcategories.map((sub) => ({
    value: sub.label,
    label: sub.label,
  })),
}));

function mergePhotos(existingPhotos, incomingPhotos) {
  const unique = [...existingPhotos];
  const seen = new Set(existingPhotos.map((file) => `${file.name}-${file.size}-${file.lastModified}`));

  incomingPhotos.forEach((file) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    const signature = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(file);
    }
  });

  return unique.slice(0, MAX_PHOTOS);
}

export default function SubmitModel({ onSubmissionSuccess }) {
  const [form, setForm] = useState(defaultForm);
  const [photos, setPhotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [serverErrors, setServerErrors] = useState({});
  const [boxesUrl, setBoxesUrl] = useState(null);
  const [onboardingUrl, setOnboardingUrl] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoProcessingError, setPhotoProcessingError] = useState("");

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (photos.length === 0) {
      nextErrors.photos = "Upload at least one printed model photo.";
    } else if (photos.length > MAX_PHOTOS) {
      nextErrors.photos = `You can upload up to ${MAX_PHOTOS} photos.`;
    }

    if (form.modelName.trim().length < 3) {
      nextErrors.modelName = "Model name must be at least 3 characters.";
    } else if (!/^[a-zA-Z0-9 ]+$/.test(form.modelName.trim())) {
      nextErrors.modelName = "Model name can only contain letters, numbers and space.";
    }

    if (form.description.trim().length < 20) {
      nextErrors.description = "Description must be at least 20 characters.";
    }

    const parsedPrice = Number(form.price);
    if (!form.price || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      nextErrors.price = "Enter a valid price greater than 0.";
    }

    // NEW VALIDATION: Ensure user picked a valid subcategory option
    if (!form.category) {
      nextErrors.category = "Please select a specific category.";
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

    Object.assign(nextErrors, validateProductSpecs(form));

    return nextErrors;
  }, [form, photos]);

  const isFormValid = Object.keys(errors).length === 0;

  const displayErrors = useMemo(
    () => ({ ...errors, ...serverErrors }),
    [errors, serverErrors]
  );

  useEffect(() => {
    if (!submitted) {
      return;
    }

    const firstErrorField = getFirstListingFieldError(displayErrors);
    if (firstErrorField) {
      scrollToListingField(firstErrorField);
    }
  }, [submitted, displayErrors]);

  function clearServerError(field) {
    setServerErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

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
    if (field === "modelWeightUnit") {
      clearServerError("modelWeight");
    } else if (field === "modelDimensionUnit") {
      clearServerError("modelHeight");
      clearServerError("modelWidth");
      clearServerError("modelLength");
    }
    clearServerError("dimensions");
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleDimensionValueChange(field, value) {
    clearServerError(field);
    clearServerError("dimensions");
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(event) {
    void addPhotos(Array.from(event.target.files || []));
    event.target.value = "";
  }

  async function addPhotos(incomingPhotos) {
    if (!incomingPhotos.length) {
      return;
    }

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

  function removePhoto(indexToRemove) {
    clearServerError("photos");
    setPhotos((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragActive(false);
    void addPhotos(Array.from(event.dataTransfer.files || []));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setSubmitMessage("");
    setServerErrors({});
    setBoxesUrl(null);
    setOnboardingUrl(null);

    if (isProcessingPhotos) {
      setSubmitMessage("Please wait while your photos finish optimizing.");
      return;
    }

    if (!isFormValid) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await submitModelListing({
        modelName: form.modelName,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        tags: form.tags,
        quantity: Number(form.quantity),
        modelWeight: form.modelWeight,
        modelWeightUnit: form.modelWeightUnit,
        modelHeight: form.modelHeight,
        modelWidth: form.modelWidth,
        modelLength: form.modelLength,
        modelDimensionUnit: form.modelDimensionUnit,
        daysToPrepare: Number(form.daysToPrepare),
        photos,
      });

      setSubmitMessage(response?.message || "Your listing is ready and queued for backend submission.");
      setBoxesUrl(null);
      setOnboardingUrl(null);
      setServerErrors({});
      setForm(defaultForm);
      setPhotos([]);
      setSubmitted(false);
      if (onSubmissionSuccess) {
        onSubmissionSuccess();
      }
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
      <div className="mx-auto w-full max-w-4xl">
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {submitted && displayErrors.general ? (
            <p
              id="listing-general-error"
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {displayErrors.general}
            </p>
          ) : null}

          {/* Photo Upload Section */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 transition-colors duration-300">
              Printed model photos <RequiredMark />
            </label>
            <label
                htmlFor="modelPhotos"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-300 ${
                    isDragActive
                        ? "border-orange-500 bg-orange-100 scale-[1.01] shadow-lg"
                        : "border-orange-200 bg-orange-50/60 hover:border-orange-400 hover:bg-orange-100/40 hover:scale-[1.01]"
                } ${isProcessingPhotos ? "pointer-events-none opacity-70" : ""}`}
            >
              <span className="text-sm font-medium text-gray-700">
                {isProcessingPhotos
                  ? "Optimizing photos..."
                  : "Drag and drop images here, or click to upload"}
              </span>
              <span className="mt-1 text-xs text-gray-500">
                Any size JPG, PNG, WEBP, or GIF — large photos are automatically compressed (max {MAX_PHOTOS} photos)
              </span>
            </label>
            <input
                id="modelPhotos"
                name="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
            />
            {photoProcessingError && (
              <p className="mt-2 text-xs text-red-500">{photoProcessingError}</p>
            )}
            {submitted && displayErrors.photos && (
              <p className="mt-2 text-xs text-red-500">{displayErrors.photos}</p>
            )}

            {previewUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {previewUrls.map((url, index) => (
                      <div key={url} style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both` }} className="relative overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
                        <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-sm font-bold text-gray-600 shadow-sm transition-all duration-300 hover:border-orange-300 hover:text-orange-500 hover:scale-110 active:scale-95 cursor-pointer"
                            aria-label={`Remove photo ${index + 1}`}
                        >
                          x
                        </button>
                        <img src={url} alt={`Printed model preview ${index + 1}`} className="h-24 w-full object-cover transition-all duration-300 hover:scale-110" />
                      </div>
                  ))}
                </div>
            )}
          </div>

          {/* Inputs Fields Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 group transition-all duration-300 hover:translate-x-1">
              <FieldLabel htmlFor="modelName">Model name</FieldLabel>
              <input
                  id="modelName"
                  name="modelName"
                  type="text"
                  value={form.modelName}
                  onChange={handleChange}
                  placeholder="Model's name"
                  className={fieldClassName(submitted && displayErrors.modelName)}
              />
              {submitted && displayErrors.modelName && (
                <p className="mt-1 text-xs text-red-500">{displayErrors.modelName}</p>
              )}
            </div>

            <div className="group transition-all duration-300 hover:translate-x-1">
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
              {submitted && displayErrors.price && (
                <p className="mt-1 text-xs text-red-500">{displayErrors.price}</p>
              )}
            </div>

            <div className="group transition-all duration-300 hover:translate-x-1">
              <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
              <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="10"
                  className={`${fieldClassName(submitted && displayErrors.quantity)} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              {submitted && displayErrors.quantity && (
                <p className="mt-1 text-xs text-red-500">{displayErrors.quantity}</p>
              )}
            </div>

            {/* FIXED: Dropdown Select implementation with strict optgroup nesting */}
            <div className="group transition-all duration-300 hover:translate-x-1">
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <CustomSelect
                id="category"
                name="category"
                value={form.category}
                onChange={(nextValue) => {
                  clearServerError("category");
                  setForm((prev) => ({ ...prev, category: nextValue }));
                }}
                placeholder="Select a category..."
                ariaLabel="Category"
                groups={categoryGroups}
              />
              {submitted && displayErrors.category && (
                <p className="mt-1 text-xs text-red-500">{displayErrors.category}</p>
              )}
              {form.category === "Other" && (
                <p className="mt-2 text-xs text-red-600 font-semibold">Setting your product category as "Other" makes your products have less sales compared to others.</p>
              )}
            </div>

            <div className="sm:col-span-2 group transition-all duration-300 hover:translate-x-1">
              <FieldLabel htmlFor="description">Model description</FieldLabel>
              <textarea
                  id="description"
                  name="description"
                  rows="5"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe size, print settings, material suggestions, and use cases..."
                  className={`${fieldClassName(submitted && displayErrors.description)} resize-none`}
              />
              {submitted && displayErrors.description && (
                  <p className="mt-1 text-xs text-red-500">{displayErrors.description}</p>
              )}
            </div>

            <ProductSpecsFields
              form={form}
              onUnitChange={handleUnitChange}
              onDimensionValueChange={handleDimensionValueChange}
              onDaysToPrepareChange={(value) => {
                clearServerError("daysToPrepare");
                setForm((prev) => ({ ...prev, daysToPrepare: value }));
              }}
              showErrors={submitted}
              errors={displayErrors}
            />

            <Tags
                tags={form.tags}
                setTags={(updater) =>
                    setForm((prev) => ({
                      ...prev,
                      tags: typeof updater === "function" ? updater(prev.tags) : updater,
                    }))
                }
            />
          </div>

            <button
                type="submit"
                disabled={isSubmitting || isProcessingPhotos}
                className={`w-full cursor-pointer rounded-xl py-3 font-semibold text-white transition-all duration-300 ${
                    isSubmitting || isProcessingPhotos
                        ? "cursor-not-allowed bg-orange-300 opacity-70"
                        : "bg-orange-500 hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                }`}
            >
            {isProcessingPhotos
              ? "Optimizing photos..."
              : isSubmitting
                ? "Preparing listing..."
                : "Submit listing"}
          </button>

          {submitMessage && (
              <p
                role="alert"
                className={`rounded-lg border px-4 py-3 text-sm animate-fade-in-up transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
                  Object.keys(serverErrors).length > 0
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-orange-200 bg-orange-50 text-gray-700"
                }`}
              >
                {submitMessage}
                {onboardingUrl && (
                  <>
                    {" "}
                    <Link
                      to={onboardingUrl}
                      className="text-orange-500 hover:text-orange-600 cursor-pointer hover:scale-105 transform-gpu transition"
                    >
                      Continue onboarding
                    </Link>
                    {" "}
                    to finish setup.
                  </>
                )}
                {boxesUrl && (
                  <>
                    {" "}
                    Visit{" "}
                    <Link
                      to={boxesUrl}
                      className="text-orange-400 hover:text-orange-500 cursor-pointer hover:scale-105 transform-gpu transition"
                    >
                      boxes
                    </Link>{" "}
                    to add the right box.
                  </>
                )}
              </p>
          )}
        </form>
      </div>
  );
}
