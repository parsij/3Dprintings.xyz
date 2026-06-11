import { Link } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";

export const SmallNavBar = () => {
  const { setMenuOpen } = useMenu();

  return (
    <header className="fixed left-0 top-0 z-50 w-full px-3 pt-3 sm:px-5">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.5rem] border border-orange-100/80 bg-white/88 px-4 py-3 text-gray-900 shadow-[0_14px_42px_rgba(17,24,39,0.1)] backdrop-blur-xl">
        <Link to="/home" className="focus-ring flex items-center gap-2 rounded-2xl" aria-label="3Dprintings.xyz Home" translate="no">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-950 font-display text-sm font-black text-orange-300">
            3D
          </span>
          <span>
            <span className="block font-display text-base font-black tracking-tight">3Dprintings</span>
            <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-orange-700">Marketplace</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="group flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 transition-colors duration-200 hover:border-orange-300 hover:bg-orange-100 focus-ring"
          aria-label="Open Menu"
        >
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="h-0.5 w-5 rounded-full bg-gray-900 transition-transform duration-200 group-hover:translate-x-1" />
            <span className="h-0.5 w-5 rounded-full bg-gray-700" />
            <span className="h-0.5 w-5 rounded-full bg-gray-900 transition-transform duration-200 group-hover:-translate-x-1" />
          </span>
        </button>
      </nav>
    </header>
  );
};

export default SmallNavBar;
