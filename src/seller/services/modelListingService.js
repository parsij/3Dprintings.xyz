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
  photos,
}) {
  const canonical = toCanonicalDimensions({
    modelWeight,
    modelWeightUnit,
    modelHeight,
    modelWidth,
    modelLength,
    modelDimensionUnit,
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
  formData.append("daysToPrepare", String(daysToPrepare));

  if (category?.trim()) {
    formData.append("category", category.trim());
  }

  if (tags?.length) {
    formData.append("tags", JSON.stringify(tags));
  }

  photos.forEach((photo) => {
    formData.append("photos", photo);
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
