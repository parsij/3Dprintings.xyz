import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useMenu } from "../../MenuContext.jsx";
import SideMenu from "../../components/SideMenu.jsx";

const SELLER_MENU_ITEMS = [
  { label: "Dashboard", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Reviews", to: "/reviews" },
  { label: "Preferences", to: "/preferences" },
];

function SellerTopBar() {
  const { setMenuOpen } = useMenu();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3">
        <Link to="/" className="text-xl font-extrabold text-gray-900 hover:text-orange-500 transition">
          3z Seller
        </Link>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:border-orange-300 hover:text-orange-500 transition"
          aria-label="Open seller menu"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}

export default function SellerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SellerTopBar />
      <SideMenu title="Seller Menu" items={SELLER_MENU_ITEMS} />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-36">
        {children}
      </main>
    </div>
  );
}