import React from "react";
import { useMenu } from "../MenuContext.jsx";

const SideMenu = () => {
  const { menuOpen, setMenuOpen } = useMenu();
  return (
    <>
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-black text-white shadow-xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          <h2 className="text-lg font-bold">Menu</h2>
          <button onClick={() => setMenuOpen(false)} className="text-white cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <a href="/home" className="block hover:text-orange-500">Home</a>
          <a href="/products" className="block hover:text-orange-500">3D Prints</a>
          <a href="#" className="block hover:text-orange-500">Become a seller</a>
        </div>
      </aside>
    </>
  );
};

export default SideMenu;