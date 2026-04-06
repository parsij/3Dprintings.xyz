import React from "react";

const SideMenu = ({ menuOpen, setMenuOpen }) => {
  return (
    <>
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-gray-900 text-white shadow-xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          <h2 className="text-lg font-bold">Menu</h2>
          <button onClick={() => setMenuOpen(false)} className="text-white">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <a href="/home" className="block hover:text-orange-500">Home</a>
          <a href="#" className="block hover:text-orange-500">Products</a>
          <a href="#" className="block hover:text-orange-500">About</a>
        </div>
      </aside>
    </>
  );
};

export default SideMenu;