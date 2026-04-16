import { useEffect, useMemo, useState } from "react";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import { submitModelListing } from "../services/modelListingService.js";

const defaultForm = {
  modelName: "",
  description: "",
  price: "",
  category: "",
  tags: "",
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

export default function SubmitModel() {
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

    const parsedTags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);

      const response = await submitModelListing({
        modelName: form.modelName,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        tags: parsedTags,
        photos,
      });

      setSubmitMessage(response?.message || "Your listing is ready and queued for backend submission.");
      setForm(defaultForm);
      setPhotos([]);
      setSubmitted(false);
    } catch (error) {
      setSubmitMessage(error?.message || "Failed to prepare listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <SmallNavBar />
      <SideMenu />

      <main className="min-h-screen bg-orange-50 px-4 pb-12 pt-24 text-gray-900">
        <section className="mx-auto w-full max-w-4xl rounded-2xl border border-orange-100 bg-white p-5 shadow-xl sm:p-8">
          <header className="mb-6 text-center sm:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight">
              List a new <span className="text-orange-500">3D printed model</span>
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Upload photos and details so buyers can discover your printed model quickly.
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Printed model photos *</label>
              <label
                htmlFor="modelPhotos"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                  isDragActive
                    ? "border-orange-500 bg-orange-100"
                    : "border-orange-200 bg-orange-50/60 hover:border-orange-400"
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
              {submitted && errors.photos && <p className="mt-2 text-xs text-red-500">{errors.photos}</p>}

              {previewUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="relative overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-sm font-bold text-gray-600 shadow-sm transition hover:border-orange-300 hover:text-orange-500"
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        x
                      </button>
                      <img src={url} alt={`Printed model preview ${index + 1}`} className="h-24 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="modelName" className="mb-1 block text-sm font-semibold text-gray-700">
                  Model name *
                </label>
                <input
                  id="modelName"
                  name="modelName"
                  type="text"
                  value={form.modelName}
                  onChange={handleChange}
                  placeholder="e.g. Articulated Dragon"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                />
                {submitted && errors.modelName && <p className="mt-1 text-xs text-red-500">{errors.modelName}</p>}
              </div>

              <div>
                <label htmlFor="price" className="mb-1 block text-sm font-semibold text-gray-700">
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                />
                {submitted && errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
              </div>

              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-semibold text-gray-700">
                  Category *
                </label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Toys, Home Decor, Tools..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className="mb-1 block text-sm font-semibold text-gray-700">
                  Model description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="5"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe size, print settings, material suggestions, and use cases..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                />
                {submitted && errors.description && (
                  <p className="mt-1 text-xs text-red-500">{errors.description}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="tags" className="mb-1 block text-sm font-semibold text-gray-700">
                  Tags (optional)
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="flexi, dragon, articulated"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                />
                <p className="mt-1 text-xs text-gray-500">Separate tags with commas.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full cursor-pointer rounded-xl py-3 font-semibold text-white transition ${
                isSubmitting
                  ? "cursor-not-allowed bg-orange-300"
                  : "bg-orange-500 hover:bg-orange-400 active:scale-[0.99]"
              }`}
            >
              {isSubmitting ? "Preparing listing..." : "Submit listing"}
            </button>

            {submitMessage && (
              <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-gray-700">
                {submitMessage}
              </p>
            )}
          </form>
        </section>
      </main>
    </>
  );
}




