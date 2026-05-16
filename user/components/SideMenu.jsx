import React from "react";
import { Link } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";

const defaultItems = [
  { label: "Home", to: "/home" },
  { label: "3D Printed Models", to: "/products" },
  { label: "Liked Products", to: "/liked-products" },
  { label: "Saved Products", to: "/saved-products" },
  { label: "My Reviews", to: "/your-reviews" },
  { label: "My Orders", to: "/account/orders" },
  { label: "Become a Seller", to: "/become-seller" },
  { label: "List a 3D Printed Model", to: "/create" },
];

const SideMenu = ({ title = "Menu", items = defaultItems }) => {
  const { menuOpen, setMenuOpen } = useMenu();
  return (
    <>
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white text-gray-800 shadow-xl border-l border-orange-100 transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-orange-100 p-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={() => setMenuOpen(false)} className="text-gray-700 hover:text-orange-500 transition cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {items.map((item) => (
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
