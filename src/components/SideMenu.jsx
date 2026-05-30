import { Link } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";
import { MARKETPLACE_HOME_URL } from "../config/api.js";

const main = [
  { label: "Home", to: "/home" },
  { label: "3D Printed Models", to: "/products" },
  { label: "Liked Products", to: "/liked-products" },
  { label: "Saved Products", to: "/saved-products" },
  { label: "My Reviews", to: "/your-reviews" },
  { label: "My Orders", to: "/account/orders" },
  { label: "Become a seller", to: "/become-seller" },
];

const seller = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Balance", to: "/balance" },
  { label: "Manage Products", to: "/inventory" },
  { label: "Boxes", to: "/boxes" },
  { label: "Orders", to: "/orders" },
  { label: "Reviews", to: "/reviews" },
  { label: "Preferences", to: "/preferences" },
  { label: "Back to Marketplace", to: MARKETPLACE_HOME_URL },
];

const SideMenu = ({ title = "Menu", role = "customer" }) => {
  const { menuOpen, setMenuOpen } = useMenu();
  const activeItems = role === "seller" ? seller : main;

  return (
    <>
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ease-in-out ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 border-r border-orange-100 bg-white text-gray-800 shadow-xl transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-orange-100 p-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="cursor-pointer text-gray-700 transition-colors duration-200 hover:text-orange-500"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-1 p-4">
          {activeItems.map((item, index) => (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={`block cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-orange-50 hover:text-orange-500 ${
                menuOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
              }`}
              style={{
                transitionDelay: menuOpen ? `${index * 35}ms` : "0ms",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default SideMenu;
