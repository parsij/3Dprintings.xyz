import axios from "axios";

import { API_BASE } from "../../config/api.js";
import { toCanonicalDimensions } from "../../utils/productDimensions.js";
import { parseListingSubmitError } from "../../utils/apiValidationErrors.js";
import { applyCsrfInterceptor, ensureCsrfToken } from "../../services/csrf.js";

const apiClient = applyCsrfInterceptor(axios.create({
  baseURL: API_BASE,
  withCredentials: true,
}));

export async function submitModelListing({
  modelName,
  description,
  price,
  category,
  tags,
  quantity,
  modelWeight,
  modelWeightUnit,
  modelHeight,
  modelWidth,
  modelLength,
  modelDimensionUnit,
  daysToPrepare,
  packedWeight,
  packedWeightUnit,
  packedHeight,
  packedWidth,
  packedLength,
  packedDimensionUnit,
  itemType,
  madeBy,
  itemKind,
  materialType,
  aiUsed,
  primaryColor,
  secondaryColor,
  variations,
  shippingProfileId,
  photos,
  videos,
}) {
  const canonical = toCanonicalDimensions({
    modelWeight,
    modelWeightUnit,
    modelHeight,
    modelWidth,
    modelLength,
    modelDimensionUnit,
  });

  const packedCanonical = toCanonicalDimensions({
    modelWeight: packedWeight,
    modelWeightUnit: packedWeightUnit,
    modelHeight: packedHeight,
    modelWidth: packedWidth,
    modelLength: packedLength,
    modelDimensionUnit: packedDimensionUnit,
  });

  const formData = new FormData();

  formData.append("modelName", modelName.trim());
  formData.append("description", description.trim());
  formData.append("price", String(price));
  formData.append("quantity", String(quantity));
  formData.append("modelWeight", String(modelWeight));
  formData.append("modelWeightUnit", modelWeightUnit);
  formData.append("modelHeight", String(modelHeight));
  formData.append("modelWidth", String(modelWidth));
  formData.append("modelLength", String(modelLength));
  formData.append("modelDimensionUnit", modelDimensionUnit);
  formData.append("modelWeightG", String(canonical.modelWeightG));
  formData.append("modelHeightMm", String(canonical.modelHeightMm));
  formData.append("modelWidthMm", String(canonical.modelWidthMm));
  formData.append("modelLengthMm", String(canonical.modelLengthMm));

  if (daysToPrepare != null) {
    formData.append("daysToPrepare", String(daysToPrepare));
  }

  if (packedWeight) {
    formData.append("packedWeight", String(packedWeight));
    formData.append("packedWeightUnit", packedWeightUnit);
    formData.append("packedHeight", String(packedHeight));
    formData.append("packedWidth", String(packedWidth));
    formData.append("packedLength", String(packedLength));
    formData.append("packedDimensionUnit", packedDimensionUnit);
    formData.append("packedWeightG", String(packedCanonical.modelWeightG));
    formData.append("packedHeightMm", String(packedCanonical.modelHeightMm));
    formData.append("packedWidthMm", String(packedCanonical.modelWidthMm));
    formData.append("packedLengthMm", String(packedCanonical.modelLengthMm));
  }

  if (category?.trim()) {
    formData.append("category", category.trim());
  }

  if (itemType) {
    formData.append("itemType", itemType);
  }
  if (madeBy) {
    formData.append("madeBy", madeBy);
  }
  if (itemKind) {
    formData.append("itemKind", itemKind);
  }
  if (materialType) {
    formData.append("materialType", materialType);
  }
  formData.append("aiUsed", aiUsed ? "true" : "false");

  if (primaryColor) {
    formData.append("primaryColor", primaryColor);
  }
  if (secondaryColor) {
    formData.append("secondaryColor", secondaryColor);
  }
  if (shippingProfileId) {
    formData.append("shippingProfileId", String(shippingProfileId));
  }
  if (Array.isArray(variations) && variations.length > 0) {
    formData.append("variations", JSON.stringify(variations));
  }

  if (tags?.length) {
    formData.append("tags", JSON.stringify(tags));
  }

  photos.forEach((photo) => {
    formData.append("photos", photo);
  });

  (videos || []).forEach((video) => {
    formData.append("videos", video);
  });

  try {
    await ensureCsrfToken(API_BASE);

    const response = await apiClient.post("/api/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  } catch (error) {
    throw parseListingSubmitError(
      error,
      "Failed to prepare listing. Please check your input and try again."
    );
  }
}
