export const DEFAULT_LISTING_DETAILS = {
  category: "",
  itemType: "",
  madeBy: "",
  itemKind: "",
  materialType: "",
  aiUsed: false,
};

export function validateListingDetails(details) {
  const errors = {};

  if (!details.category) {
    errors.category = "Please select a specific category.";
  }

  if (!details.itemType) {
    errors.itemType = "Select whether this is a physical item or a digital file.";
  }

  if (!details.madeBy) {
    errors.madeBy = "Select who made this item.";
  }

  if (!details.itemKind) {
    errors.itemKind = "Select what kind of item this is.";
  }

  if (details.itemType === "physical" && !details.materialType) {
    errors.materialType = "Select what this item is made out of.";
  }

  return errors;
}
