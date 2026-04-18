import axios from "axios";

export async function submitModelListing({
  modelName,
  description,
  price,
  category,
  tags,
  photos,
}) {
  const formData = new FormData();

  formData.append("modelName", modelName.trim());
  formData.append("description", description.trim());
  formData.append("price", String(price));

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
      "http://localhost:3000/api/create",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true, //sending cookies for authentication
      }
    );

    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Failed to prepare listing. Please check your input and try again.";
    throw new Error(message);
  }
}

