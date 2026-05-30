import { useEffect, useMemo, useState } from "react";
import { submitModelListing } from "../services/modelListingService.js";
import Tags from "../../components/Tags.jsx";
import UnitNumberInput from "../components/UnitNumberInput.jsx";
import DaysToPrepareInput from "../components/DaysToPrepareInput.jsx";
import {
  validateDaysToPrepare,
  validateDimensionInput,
  validateWeightInput,
} from "../../utils/productDimensions.js";

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

const MAX_PHOTOS = 10;

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
  const [isDragActive, setIsDragActive] = useState(false);

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
    if (!form.quantity || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      nextErrors.quantity = "Enter a valid quantity greater than 0.";
    }

    const weightError = validateWeightInput(form.modelWeight, form.modelWeightUnit);
    if (weightError) {
      nextErrors.modelWeight = weightError;
    }

    [
      ["modelHeight", "Height"],
      ["modelWidth", "Width"],
      ["modelLength", "Length"],
    ].forEach(([field, label]) => {
      const dimensionError = validateDimensionInput(form[field], form.modelDimensionUnit, label);
      if (dimensionError) {
        nextErrors[field] = dimensionError;
      }
    });

    const daysToPrepareError = validateDaysToPrepare(form.daysToPrepare);
    if (daysToPrepareError) {
      nextErrors.daysToPrepare = daysToPrepareError;
    }

    return nextErrors;
  }, [form, photos]);

  const isFormValid = Object.keys(errors).length === 0;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleUnitChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleDimensionValueChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    setPhotos((prev) => mergePhotos(prev, selectedFiles));
    event.target.value = "";
  }

  function removePhoto(indexToRemove) {
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
    const droppedFiles = Array.from(event.dataTransfer.files || []);
    setPhotos((prev) => mergePhotos(prev, droppedFiles));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setSubmitMessage("");

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
      setForm(defaultForm);
      setPhotos([]);
      setSubmitted(false);
      if (onSubmissionSuccess) {
        onSubmissionSuccess();
      }
    } catch (error) {
      setSubmitMessage(error?.message || "Failed to prepare listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <div className="mx-auto w-full max-w-4xl">
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {/* Photo Upload Section */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 transition-colors duration-300">Printed model photos *</label>
            <label
                htmlFor="modelPhotos"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-300 ${
                    isDragActive
                        ? "border-orange-500 bg-orange-100 scale-[1.01] shadow-lg"
                        : "border-orange-200 bg-orange-50/60 hover:border-orange-400 hover:bg-orange-100/40 hover:scale-[1.01]"
                }`}
            >
              <span className="text-sm font-medium text-gray-700">Drag and drop images here, or click to upload</span>
              <span className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP or GIF (max {MAX_PHOTOS} photos)</span>
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
            {submitted && errors.photos && <p className="mt-2 text-xs text-red-500 animate-pulse">{errors.photos}</p>}

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
              <label htmlFor="modelName" className="mb-1 block text-sm font-semibold text-gray-700 transition-colors duration-300 group-hover:text-orange-600">
                Model name *
              </label>
              <input
                  id="modelName"
                  name="modelName"
                  type="text"
                  value={form.modelName}
                  onChange={handleChange}
                  placeholder="Model's name"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
              />
              {submitted && errors.modelName && <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.modelName}</p>}
            </div>

            <div className="group transition-all duration-300 hover:translate-x-1">
              <label htmlFor="price" className="mb-1 block text-sm font-semibold text-gray-700 transition-colors duration-300 group-hover:text-orange-600">
                Price (USD) *
              </label>
              <input
                  id="price"
                  name="price"
                  type="text"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="19.99"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
              />
              {submitted && errors.price && <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.price}</p>}
            </div>

            <div className="group transition-all duration-300 hover:translate-x-1">
              <label htmlFor="quantity" className="mb-1 block text-sm font-semibold text-gray-700 transition-colors duration-300 group-hover:text-orange-600">
                Quantity *
              </label>
              <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="10"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {submitted && errors.quantity && <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.quantity}</p>}
            </div>

            {/* FIXED: Dropdown Select implementation with strict optgroup nesting */}
            <div className="group transition-all duration-300 hover:translate-x-1">
              <label htmlFor="category" className="mb-1 block text-sm font-semibold text-gray-700 transition-colors duration-300 group-hover:text-orange-600">
                Category *
              </label>
              <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
              >
                <option value="">Select a category...</option>
                {CATEGORY_DATA.map((group) => (
                    <optgroup key={group.slug} label={group.title} className="font-bold text-gray-900 bg-gray-50">
                      {group.subcategories.map((sub) => (
                          <option key={sub.slug} value={sub.label} className="font-normal text-gray-700 bg-white">
                            {sub.label}
                          </option>
                      ))}
                    </optgroup>
                ))}
              </select>
              {submitted && errors.category && <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.category}</p>}
              {form.category === "Other" && (
                <p className="mt-2 text-xs text-red-600 font-semibold">Setting your product category as "Other" makes your products have less sales compared to others.</p>
              )}
            </div>

            <div className="sm:col-span-2 group transition-all duration-300 hover:translate-x-1">
              <label htmlFor="description" className="mb-1 block text-sm font-semibold text-gray-700 transition-colors duration-300 group-hover:text-orange-600">
                Model description *
              </label>
              <textarea
                  id="description"
                  name="description"
                  rows="5"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe size, print settings, material suggestions, and use cases..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer resize-none"
              />
              {submitted && errors.description && (
                  <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.description}</p>
              )}
            </div>

            <div className="sm:col-span-2 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <h3 className="text-sm font-semibold text-gray-800">Model weight *</h3>
              <p className="mt-1 text-xs text-gray-600">
                Enter a whole number greater than 0. Maximum weight is 50 kg.
              </p>
              <div className="mt-2">
                <UnitNumberInput
                  id="modelWeight"
                  name="modelWeight"
                  value={form.modelWeight}
                  unit={form.modelWeightUnit}
                  units={[
                    { value: "lb", label: "lb" },
                    { value: "kg", label: "kg" },
                  ]}
                  onValueChange={(value) => handleDimensionValueChange("modelWeight", value)}
                  onUnitChange={(value) => handleUnitChange("modelWeightUnit", value)}
                  placeholder="Weight"
                />
              </div>
              {submitted && errors.modelWeight && (
                <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.modelWeight}</p>
              )}
            </div>

            <div className="sm:col-span-2 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <h3 className="text-sm font-semibold text-gray-800">Model dimensions *</h3>
              <p className="mt-1 text-xs text-gray-600">
                Enter whole numbers greater than 0. Each side can be at most 300 cm. Accurate values help avoid shipping adjustment charges.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["modelHeight", "Height"],
                  ["modelWidth", "Width"],
                  ["modelLength", "Length"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label htmlFor={field} className="mb-1 block text-xs font-semibold text-gray-700">
                      {label}
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
                      onValueChange={(value) => handleDimensionValueChange(field, value)}
                      onUnitChange={(value) => handleUnitChange("modelDimensionUnit", value)}
                      placeholder={label}
                    />
                    {submitted && errors[field] && (
                      <p className="mt-1 text-xs text-red-500 animate-pulse">{errors[field]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <h3 className="text-sm font-semibold text-gray-800">Days to prepare *</h3>
              <p className="mt-1 text-xs text-gray-600">
                How many days you need to print and pack this item before shipping. Choose 1 to 7 days.
              </p>
              <div className="mt-2 max-w-xs">
                <DaysToPrepareInput
                  id="daysToPrepare"
                  name="daysToPrepare"
                  value={form.daysToPrepare}
                  onChange={(value) => setForm((prev) => ({ ...prev, daysToPrepare: value }))}
                />
              </div>
              {submitted && errors.daysToPrepare && (
                <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.daysToPrepare}</p>
              )}
            </div>

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
              disabled={isSubmitting}
              className={`w-full rounded-xl py-3 font-semibold text-white transition-all duration-300 ${
                  isSubmitting
                      ? "cursor-not-allowed bg-orange-300 opacity-70"
                      : "cursor-pointer bg-orange-500 hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              }`}
          >
            {isSubmitting ? "Preparing listing..." : "Submit listing"}
          </button>

          {submitMessage && (
              <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-gray-700 animate-fade-in-up transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
                {submitMessage}
              </p>
          )}
        </form>
      </div>
  );
}
