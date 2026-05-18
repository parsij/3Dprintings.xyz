import React from "react";
import { Link } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";

const main = [
  { label: "Home", to: "/home" },
  { label: "3D Printed Models", to: "/products" },
  { label: "Liked Products", to: "/liked-products" },
  { label: "Saved Products", to: "/saved-products" },
  { label: "My Reviews", to: "/your-reviews" },
  { label: "My Orders", to: "/account/orders" },
    { label: "Become a seller", to: "/become-seller" },
    // Removed the "List a 3D Printed Model" entry from the marketplace menu
    // It should remain accessible only via seller routes if needed
];

const seller = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Manage Products", to: "/inventory" },
  { label: "Orders", to: "/orders" },
  { label: "Reviews", to: "/reviews" },
  { label: "Preferences", to: "/preferences" },
  { label: "Back to Marketplace", to: "https://3dprintings.xyz/home" },
];

const SideMenu = ({ title = "Menu", role = "customer" }) => {
  const { menuOpen, setMenuOpen } = useMenu();

  const activeItems = role === "seller" ? seller : main;

  return (
      <>
        {/* Overlay Backdrop */}
        <div
            onClick={() => setMenuOpen(false)}
            className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${
                menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
        />

        {/* Sidebar Drawer */}
        <aside
            className={`fixed top-0 left-0 z-50 h-full w-72 bg-white text-gray-800 shadow-xl border-r border-orange-100 transition-transform duration-300 ${
                menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between border-b border-orange-100 p-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
                onClick={() => setMenuOpen(false)}
                className="text-gray-700 hover:text-orange-500 transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links rendering from the safely computed array */}
          <div className="p-4 space-y-3">
            {activeItems.map((item) => (
                <Link
                    key={`${item.to}-${item.label}`}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="block hover:text-orange-500 transition"
                >
                  {item.label}
                </Link>
            ))}
          </div>
        </aside>
      </>
  );
};

export default SideMenu;
