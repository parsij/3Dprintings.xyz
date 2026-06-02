export const LISTING_COLOR_OPTIONS = [
  { value: "Black", label: "Black" },
  { value: "White", label: "White" },
  { value: "Gray", label: "Gray" },
  { value: "Red", label: "Red" },
  { value: "Blue", label: "Blue" },
  { value: "Green", label: "Green" },
  { value: "Yellow", label: "Yellow" },
  { value: "Orange", label: "Orange" },
  { value: "Purple", label: "Purple" },
  { value: "Pink", label: "Pink" },
  { value: "Brown", label: "Brown" },
  { value: "Beige", label: "Beige" },
  { value: "Gold", label: "Gold" },
  { value: "Silver", label: "Silver" },
  { value: "Multicolor", label: "Multicolor" },
  { value: "Other", label: "Other" },
];

export const DEFAULT_SIZE_OPTIONS = [
  "Extra Small",
  "Small",
  "Medium",
  "Large",
  "Extra Large",
];

export const DEFAULT_VARIATION_PRESETS = [
  {
    key: "primary_color",
    label: "Primary color",
    defaultOptions: LISTING_COLOR_OPTIONS.map((entry) => entry.label),
  },
  {
    key: "secondary_color",
    label: "Secondary color",
    defaultOptions: LISTING_COLOR_OPTIONS.map((entry) => entry.label),
  },
  {
    key: "size",
    label: "Size",
    defaultOptions: DEFAULT_SIZE_OPTIONS,
  },
  {
    key: "filament",
    label: "Filament",
    defaultOptions: [],
  },
];
