import React from "react";
import { Link } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";

const SideMenu = () => {
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
          <h2 className="text-lg font-bold">Menu</h2>
          <button onClick={() => setMenuOpen(false)} className="text-gray-700 hover:text-orange-500 transition cursor-pointer">
            ✕
          </button>
        </div>

          <div className="p-4 space-y-3">
          <Link to="/home" onClick={() => setMenuOpen(false)} className="block hover:text-orange-500 transition">Home</Link>
          <Link to="/products" onClick={() => setMenuOpen(false)} className="block hover:text-orange-500 transition">3D Printed Models</Link>
          <Link to="/liked-products" onClick={() => setMenuOpen(false)} className="block hover:text-orange-500 transition">Liked Products</Link>
          <Link to="/saved-products" onClick={() => setMenuOpen(false)} className="block hover:text-orange-500 transition">Saved Products</Link>
          <Link to="/your-reviews" onClick={() => setMenuOpen(false)} className="block hover:text-orange-500 transition">Your Reviews</Link>
          <Link to="/account/orders" onClick={() => setMenuOpen(false)} className="block hover:text-orange-500 transition">Your Orders</Link>
          <Link to="/create" onClick={() => setMenuOpen(false)} className="block hover:text-orange-500 transition">List a 3D Printed Model</Link>
        </div>
      </aside>
    </>
  );
};

export default SideMenu;