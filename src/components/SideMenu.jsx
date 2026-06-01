import { Link } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";
import { useAuth } from "../AuthContext.jsx";
import { MARKETPLACE_HOME_URL, SELLER_SITE_ORIGIN } from "../config/api.js";

function buildCustomerMenuItems(isSeller) {
  const items = [
    { label: "Home", to: "/home" },
    { label: "3D Printed Models", to: "/products" },
    { label: "Liked Products", to: "/liked-products" },
    { label: "Saved Products", to: "/saved-products" },
    { label: "My Reviews", to: "/your-reviews" },
    { label: "My Orders", to: "/account/orders" },
    { label: "Messages", to: "/messages" },
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

  return items;
}

const seller = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Balance", to: "/balance" },
  { label: "Manage Products", to: "/inventory" },
  { label: "Boxes", to: "/boxes" },
  { label: "Orders", to: "/orders" },
  { label: "Messages", to: "/messages" },
  { label: "Reviews", to: "/reviews" },
  { label: "Preferences", to: "/preferences" },
  { label: "Back to Marketplace", to: MARKETPLACE_HOME_URL },
];

const SideMenu = ({ title = "Menu", role = "customer" }) => {
  const { menuOpen, setMenuOpen } = useMenu();
  const { user } = useAuth();
  const isSeller = String(user?.role || "").trim().toLowerCase() === "seller";
  const activeItems = role === "seller" ? seller : buildCustomerMenuItems(isSeller);

  return (
    <>
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ease-in-out ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-orange-100 bg-white text-gray-800 shadow-xl transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-orange-100 p-4">
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

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
          {activeItems.map((item, index) => {
            const className = `block cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-orange-50 hover:text-orange-500 ${
              menuOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
            }`;
            const style = {
              transitionDelay: menuOpen ? `${index * 35}ms` : "0ms",
            };

            if (item.external) {
              return (
                <a
                  key={`${item.to}-${item.label}`}
                  href={item.to}
                  onClick={() => setMenuOpen(false)}
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
                onClick={() => setMenuOpen(false)}
                className={className}
                style={style}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default SideMenu;
