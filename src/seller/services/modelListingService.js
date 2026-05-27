import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function submitModelListing({
  modelName,
  description,
  price,
  category,
  tags,
  quantity,
  modelWeight,
  modelHeight,
  modelWidth,
  modelLength,
  photos,
}) {
  const formData = new FormData();

  formData.append("modelName", modelName.trim());
  formData.append("description", description.trim());
  formData.append("price", String(price));
  formData.append("quantity", String(quantity));
  formData.append("modelWeight", String(modelWeight));
  formData.append("modelHeight", String(modelHeight));
  formData.append("modelWidth", String(modelWidth));
  formData.append("modelLength", String(modelLength));

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
    if (data?.boxesUrl) {
      throw new Error(`${data.message} Visit ${data.boxesUrl} to add a fitting box.`);
    }
    const message =
      data?.message ||
      data?.errors?.dimensions ||
      "Failed to prepare listing. Please check your input and try again.";
    throw new Error(message);
  }
}