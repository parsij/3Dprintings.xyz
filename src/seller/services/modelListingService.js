import axios from "axios";

import { API_BASE } from "../../config/api.js";
import { toCanonicalDimensions } from "../../utils/productDimensions.js";
import { createApiValidationError } from "../../utils/apiValidationErrors.js";
import { getUserFacingError } from "../../utils/userFacingError.js";

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
      const response = await axios.post(
      `${API_BASE}/api/create`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true, //sending cookies for authentication
      }
    );

    return response.data;
  } catch (error) {
    const data = error?.response?.data;

    if (data?.errors && typeof data.errors === "object") {
      throw createApiValidationError(
        data,
        "Please fix the highlighted fields below."
      );
    }

    if (data?.boxesUrl) {
      throw createApiValidationError(
        data,
        getUserFacingError(
          { response: { data } },
          "You need to configure shipping boxes before listing products."
        )
      );
    }

    throw new Error(
      getUserFacingError(
        { response: { data } },
        "Failed to prepare listing. Please check your input and try again."
      )
    );
  }
}
