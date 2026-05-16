import { useEffect, useMemo, useState } from "react";
import { submitModelListing } from "../services/modelListingService.js";
import Tags from "../components/Tags.jsx";

const defaultForm = {
  modelName: "",
  description: "",
  price: "",
  category: "",
  tags: [],
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

    return nextErrors;
  }, [form, photos]);

  const isFormValid = Object.keys(errors).length === 0;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
                  type="price"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="19.99"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
                />
                {submitted && errors.price && <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.price}</p>}
              </div>

              <div className="group transition-all duration-300 hover:translate-x-1">
                <label htmlFor="category" className="mb-1 block text-sm font-semibold text-gray-700 transition-colors duration-300 group-hover:text-orange-600">
                  Category *
                </label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Toys, Home Decor, Tools..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
                />
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