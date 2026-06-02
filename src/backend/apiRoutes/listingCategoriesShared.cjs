const LISTING_CATEGORIES = new Set([
  "Extruder & Hotend Mods",
  "Cooling Fan Ducts",
  "Bed Leveling Mounts & Spacers",
  "Spool Holders & Filament Guides",
  "Enclosure Parts & Vents",
  "Printer Tool Holders & Trays",
  "Cable Management Chains",
  "Other 3D Printer Parts & Upgrades",
  "Adapters & Converters",
  "Brackets & Mounts",
  "Hooks & Hangers",
  "Hinges, Clasps & Joints",
  "Knobs, Dials & Handles",
  "Spacers, Washers & Shims",
  "Replacement Appliance Parts",
  "Other Functional Parts & Hardware",
  "Articulated & Flexi Toys",
  "Multicolor & Multi-material Models",
  "Fidget Toys & Spinners",
  "Action Figures & Mechs",
  "Puzzles & Brain Teasers",
  "Dollhouse & Miniatures",
  "Vehicles (Cars, Planes, Boats)",
  "Other Toys & Play",
  "Tabletop RPG Miniatures",
  "Terrain & Scenery Set Pieces",
  "Dice Towers & Storage Boxes",
  "Board Game Inserts & Organizers",
  "Card Holders & Deck Boxes",
  "Tokens, Trackers & Coins",
  "Other Tabletop & Board Games",
  "Phone & Tablet Stands",
  "Laptop Mounts & Monitor Risers",
  "Controller & Headphone Stands",
  "Cable Clips & Desk Routing",
  "Smart Home Device Mounts",
  "SD Card & USB Drive Organizers",
  "Other Tech & Gadget Accessories",
  "Vases & Plant Pots",
  "Desk Organizers & Pen Holders",
  "Bathroom & Kitchen Accessories",
  "Pegboard Accessories & Hooks",
  "Keychains & Bag Tags",
  "Custom Lithophanes & Lighting",
  "Other Home & Office Organizers",
  "RC Car Chassis & Upgrades",
  "Drone Frames & Camera Mounts",
  "Microcontroller & Pi Cases",
  "Gears, Racks & Pinions",
  "Other RC, Drones & Robotics",
  "Helmets & Masks",
  "Armor Pieces",
  "Weapon Replicas",
  "Costume Jewelry & Wearables",
  "Other Props & Cosplay",
  "Other",
]);

function validateListingCategory(category) {
  const normalized = String(category || "").trim();

  if (!normalized) {
    return "Please select a specific category.";
  }

  if (!LISTING_CATEGORIES.has(normalized)) {
    return "Select a valid listing category.";
  }

  return "";
}

module.exports = {
  LISTING_CATEGORIES,
  validateListingCategory,
};
