import axios from "axios";

const API_BASE = "http://localhost:3000";

// Create an axios instance with credentials enabled globally
const axiosWithCredentials = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

/**
 * Add a product to the user's cart.
 * @param {number} productId - The product ID
 * @param {number} quantity - Quantity to add (default 1)
 */
export async function addToCart(productId, quantity = 1) {
  try {
    console.log('[addToCart] Adding productId:', productId, 'quantity:', quantity);
    const response = await axiosWithCredentials.post("/api/cart", {
      productId,
      quantity,
    });
    console.log('[addToCart] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      `[addToCart] Error adding product ${productId}:`,
      error?.response?.data || error?.message || error
    );
    throw error;
  }
}

/**
 * Fetch user's cart.
 * Returns the cart structure: { cart: { productId: quantity, ... } }
 * Then fetches full product details for each item and returns array of cart items with product info.
 */
export async function getCart() {
  try {
    // Get the user's cart (product IDs and quantities)
    const cartResponse = await axiosWithCredentials.get("/api/cart");
    const cartData = cartResponse.data.cart || {};

    // If cart is empty, return empty array
    if (Object.keys(cartData).length === 0) {
      return [];
    }

    // Fetch product details for each product ID
    const productIds = Object.keys(cartData);
    const cartItemsWithDetails = [];

    for (const productId of productIds) {
      try {
        const productResponse = await axiosWithCredentials.get(
          `/api/products/${productId}`
        );
        const product = productResponse.data;
        cartItemsWithDetails.push({
          id: Number(productId),
          quantity: cartData[productId],
          // Product details
          name: product.name,
          creator_name: product.creator_name,
          current_price: product.current_price,
          original_price: product.original_price,
          rating: product.rating,
          reviews_count: product.reviews_count,
          image_url: product.image_url,
        });
      } catch (error) {
        console.error(`Error fetching product ${productId}:`, error);
        // Skip this product if it doesn't exist or API fails
      }
    }

    return cartItemsWithDetails;
  } catch (error) {
    console.error(
      "Error fetching cart:",
      error?.response?.data || error?.message || error
    );
    throw error;
  }
}

/**
 * Update the quantity of a product in the cart.
 * Sends a PATCH request to update the product quantity.
 * @param {number} productId - The product ID
 * @param {number} newQuantity - The new quantity
 */
export async function updateCartQuantity(productId, newQuantity) {
  try {
    const response = await axiosWithCredentials.patch("/api/cart", {
      productId,
      quantity: newQuantity,
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error updating quantity for product ${productId}:`,
      error?.response?.data || error?.message || error
    );
    throw error;
  }
}

/**
 * Remove a product from the cart entirely.
 * Sends a DELETE request to remove the product.
 * @param {number} productId - The product ID to remove
 */
export async function removeFromCart(productId) {
  try {
    const response = await axiosWithCredentials.delete("/api/cart", {
      data: { productId },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error removing product ${productId}:`,
      error?.response?.data || error?.message || error
    );
    throw error;
  }
}


