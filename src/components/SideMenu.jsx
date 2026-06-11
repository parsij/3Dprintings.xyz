import { Link } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";
import { useAuth } from "../AuthContext.jsx";
import { useTheme } from "../ThemeContext.jsx";
import { MARKETPLACE_HOME_URL, SELLER_SITE_ORIGIN } from "../config/api.js";

function buildCustomerMenuItems(isSeller) {
  const items = [
    { label: "Home", to: "/home" },
    { label: "Shop 3D Prints", to: "/products" },
    { label: "Liked Products", to: "/liked-products" },
    { label: "Saved Products", to: "/saved-products" },
    { label: "Orders", to: "/account/orders" },
    { label: "Messages", to: "/messages" },
    { label: "Your Reviews", to: "/your-reviews" },
  ];

  if (isSeller) {
    items.push({
      label: "Seller Dashboard",
      to: `${SELLER_SITE_ORIGIN}/dashboard`,
      external: true,
    });
  } else {
    items.push({ label: "Become a Seller", to: "/become-seller" });
  }

  items.push({ label: "Terms", to: "/terms" });
  items.push({ label: "Privacy", to: "/privacy" });

  return items;
}

const seller = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Balance", to: "/balance" },
  { label: "Inventory", to: "/inventory" },
  { label: "Shipping Boxes", to: "/boxes" },
  { label: "Orders", to: "/orders" },
  { label: "Messages", to: "/messages" },
  { label: "Reviews", to: "/reviews" },
  { label: "Preferences", to: "/preferences" },
  { label: "Back To Marketplace", to: MARKETPLACE_HOME_URL, external: true },
];

const SideMenu = ({ title = "Menu", role = "customer" }) => {
  const { menuOpen, setMenuOpen } = useMenu();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const isSeller = String(user?.role || "").trim().toLowerCase() === "seller";
  const activeItems = role === "seller" ? seller : buildCustomerMenuItems(isSeller);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-gray-950/45 backdrop-blur-[2px] transition-opacity duration-300"
          aria-label="Close Menu Overlay"
        />
      )}

      {menuOpen && (
      <aside
        className="fixed left-0 top-0 z-50 flex h-full w-[min(21rem,88vw)] flex-col overflow-hidden border-r border-orange-100/80 bg-orange-50 text-gray-900 shadow-2xl transition-transform duration-300 ease-out"
      >
        <div className="maker-grid relative overflow-hidden border-b border-orange-200/70 p-5">
          <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-orange-300/35 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">3Dprintings</p>
              <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-gray-950">{title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                Find prints, manage orders, or start selling from one place.
              </p>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              className="rounded-2xl border border-orange-200 bg-white/80 px-3 py-2 text-sm font-black text-gray-800 transition-colors duration-200 hover:border-orange-400 hover:text-orange-700 focus-ring"
              aria-label="Close Menu"
            >
              Close
            </button>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
          {activeItems.map((item, index) => {
            const className = `block rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-700 transition-[background-color,color,transform,opacity] duration-200 hover:translate-x-1 hover:bg-white hover:text-orange-700 focus-ring ${
              menuOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
            }`;
            const style = {
              transitionDelay: menuOpen ? `${index * 32}ms` : "0ms",
            };

            if (item.external) {
              return (
                <a
                  key={`${item.to}-${item.label}`}
                  href={item.to}
                  onClick={closeMenu}
                  className={className}
                  style={style}
                >
                  {item.label}
                </a>
              );
            }

            return (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                onClick={closeMenu}
                className={className}
                style={style}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-orange-200/80 p-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between gap-3 rounded-3xl border border-orange-200 bg-white/80 px-4 py-3 text-left transition-colors duration-200 hover:border-orange-400 hover:bg-white focus-ring"
            aria-pressed={isDarkMode}
            aria-label={`Switch To ${isDarkMode ? "Light" : "Dark"} Mode`}
          >
            <span>
              <span className="block text-sm font-black text-gray-950">Appearance</span>
              <span className="block text-xs font-bold text-gray-600">
                {isDarkMode ? "Dark Mode Enabled" : "Light Mode Enabled"}
              </span>
            </span>
            <span
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
                isDarkMode ? "bg-zinc-700" : "bg-orange-200"
              }`}
              aria-hidden="true"
            >
              <span
                className={`theme-toggle-thumb flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-gray-900 shadow-sm transition-transform duration-200 ${
                  isDarkMode ? "translate-x-6" : "translate-x-0"
                }`}
              >
                {isDarkMode ? "D" : "L"}
              </span>
            </span>
          </button>
        </div>
      </aside>
      )}
    </>
  );
};

export default SideMenu;
