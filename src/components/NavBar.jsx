import { useRef, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import accountLogo from "../assets/accountLogo.svg";
import accountLogoHover from "../assets/accountLogoHover.svg";
import Search from "../assets/search.svg";
import Cart from "../assets/Cart.svg";
import CartHover from "../assets/CartHover.svg";
import SideMenu from "./SideMenu.jsx";
import { useMenu } from "../MenuContext.jsx";

export default function Navbar({ isSignedIn, NoNavBarLimit }) {
  const { setMenuOpen } = useMenu();
  const navigate = useNavigate();
  const [showNavbar, setShowNavbar] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const lastScrollY = useRef(0);

  const showNavBar = useCallback(() => {
    const currentScrollY = window.scrollY;
    const shouldReactToScroll = currentScrollY > window.innerHeight || NoNavBarLimit;

    if (!shouldReactToScroll) {
      setShowNavbar(true);
      lastScrollY.current = currentScrollY;
      return;
    }

    if (currentScrollY - lastScrollY.current > 7) {
      setShowNavbar(false);
    } else if (currentScrollY - lastScrollY.current < -7) {
      setShowNavbar(true);
    }

    lastScrollY.current = currentScrollY;
  }, [NoNavBarLimit]);

  useEffect(() => {
    window.addEventListener("scroll", showNavBar, { passive: true });
    return () => {
      window.removeEventListener("scroll", showNavBar);
    };
  }, [showNavBar]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchInput("");
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip To Content
      </a>

      <header
        className={`fixed left-0 top-0 z-50 w-full px-3 pt-3 transition-transform duration-300 sm:px-5 lg:px-[5vw] ${
          showNavbar ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center gap-3 rounded-[1.75rem] border border-white/55 bg-emerald-950/86 px-3 py-2.5 text-white shadow-[0_18px_60px_rgba(17,24,39,0.2)] backdrop-blur-xl sm:px-4">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-colors duration-200 hover:border-red-300/70 hover:bg-red-500/15 focus-ring"
            aria-label="Open Menu"
          >
            <span className="flex flex-col gap-1.5" aria-hidden="true">
              <span className="h-0.5 w-5 rounded-full bg-white transition-colors duration-150 group-hover:bg-red-300" />
              <span className="h-0.5 w-5 rounded-full bg-white/80 transition-colors duration-200 group-hover:bg-white" />
              <span className="h-0.5 w-5 rounded-full bg-white transition-colors duration-150 group-hover:bg-red-300" />
            </span>
          </button>

          <Link
            to="/home"
            className="group flex min-w-0 shrink-0 items-center gap-2 rounded-2xl px-1 py-1 focus-ring"
            aria-label="3Dprintings.xyz Home"
            translate="no"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-red-500 to-emerald-800 text-sm font-black text-white shadow-lg shadow-emerald-950/25">
              3D
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block font-display text-base font-bold tracking-tight">3Dprintings</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-red-100">Models</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 text-sm font-bold text-white/80 lg:flex">
            <Link to="/products" className="rounded-full px-4 py-2 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-ring">
              Browse
            </Link>
            <Link to="/become-seller" className="rounded-full px-4 py-2 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-ring">
              Sell
            </Link>
          </div>

          <form onSubmit={handleSearch} role="search" className="min-w-0 flex-1">
            <label htmlFor="site-search" className="sr-only">
              Search 3D printed products and files
            </label>
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 transition-colors duration-200 focus-within:border-red-300/80 focus-within:bg-white/15">
              <input
                id="site-search"
                name="q"
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search models, parts, STL files..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full bg-transparent px-4 py-3 pr-13 text-sm font-semibold text-white placeholder:text-white/52 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-white text-gray-950 transition-colors duration-200 hover:bg-red-400 focus-ring"
                aria-label="Search"
              >
                <img src={Search} alt="" className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="flex shrink-0 items-center gap-2">
            {isSignedIn ? (
              <Link
                to="/account"
                className="group relative hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-colors duration-200 hover:border-red-300/70 hover:bg-red-500/15 focus-ring sm:inline-flex"
                aria-label="Account"
              >
                <img
                  src={accountLogo}
                  alt=""
                  className="absolute h-7 w-7 object-contain opacity-100 transition-opacity duration-200 group-hover:opacity-0"
                  aria-hidden="true"
                />
                <img
                  src={accountLogoHover}
                  alt=""
                  className="absolute h-7 w-7 object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </Link>
            ) : (
              <Link
                to="/signup"
                className="hidden rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-gray-950 transition-colors duration-200 hover:bg-red-300 focus-ring sm:inline-flex"
              >
                Sign up
              </Link>
            )}

            <Link
              to="/cart"
              className="group relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-colors duration-200 hover:border-red-300/70 hover:bg-red-500/15 focus-ring"
              aria-label="Cart"
            >
              <img
                src={Cart}
                alt=""
                className="absolute h-7 w-7 object-contain opacity-100 transition-opacity duration-200 group-hover:opacity-0"
                aria-hidden="true"
              />
              <img
                src={CartHover}
                alt=""
                className="absolute h-7 w-7 object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                aria-hidden="true"
              />
            </Link>
          </div>
        </nav>
      </header>

      <SideMenu />
    </>
  );
}
