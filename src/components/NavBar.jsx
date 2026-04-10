import { useRef, useState, useEffect } from "react";
import accountLogo from "../assets/accountLogo.svg";
import accountLogoHover from "../assets/accountLogoHover.svg";
import Search from "../assets/search.svg";
import Cart from "../assets/Cart.svg";
import CartHover from "../assets/CartHover.svg";
import SideMenu from "./SideMenu.jsx";
import { useMenu } from "../MenuContext.jsx";

export default function Navbar({ isSingedIn }) {
  const { setMenuOpen } = useMenu();
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollY = useRef(0);

  function showNavBar() {
    const currentScrollY = window.scrollY;

    if (currentScrollY > window.innerHeight) {
      if (currentScrollY - lastScrollY.current > 5) {
        setShowNavbar(false);
      } else if (currentScrollY - lastScrollY.current < -5) {
        setShowNavbar(true);
      }
    } else {
      setShowNavbar(true);
    }

    lastScrollY.current = currentScrollY;
  }

  useEffect(() => {
    window.addEventListener("scroll", showNavBar);
    return () => {
      window.removeEventListener("scroll", showNavBar);
    };
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 bg-black/70 backdrop-blur-lg shadow-sm border-b border-white/20 text-white transition-transform duration-300 ${
          showNavbar ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="flex items-center gap-3 md:gap-4 max-w-7xl mx-auto px-3 md:px-4 py-3">
          <a
            href="/home"
            className="text-xl font-extrabold flex gap-2 transition hover:text-orange-500 shrink-0"
          >
            3z
          </a>

          <a
            href="#"
            className="font-bold hidden md:block transition hover:text-orange-500 shrink-0"
          >
            3D prints
          </a>

          <div className="flex-1 min-w-0">
            <div className="relative w-full overflow-hidden rounded-full border-2 border-gray-300 transition focus-within:border-orange-500 bg-black/20">
              <input
                type="text"
                placeholder="Search"
                className="w-full bg-transparent text-white placeholder:text-gray-300 px-4 py-2 pr-14 md:pr-16 outline-none"
              />
              <button className="absolute right-0 top-0 h-full bg-white px-3 transition hover:bg-orange-500 cursor-pointer flex items-center justify-center">
                <img src={Search} alt="Search" className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="group flex cursor-pointer flex-col gap-1 px-1 md:px-2 shrink-0"
            aria-label="Open menu"
          >
            <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
            <span className="h-0.5 w-6 bg-white transition group-hover:bg-white"></span>
            <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
          </button>

          <a
            href="/cart"
            className="group relative cursor-pointer flex items-center justify-center shrink-0 h-6 w-6 md:h-8 md:w-8"
            aria-label="Cart"
          >
            <img
              src={Cart}
              alt="Cart"
              className="absolute inset-0 h-full w-full object-contain opacity-100 transition-opacity duration-300 group-hover:opacity-0"
            />
            <img
              src={CartHover}
              alt="Cart hover"
              className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          </a>

          <div className="shrink-0">
            {isSingedIn ? (
              <button
                className="group relative h-6 w-6 md:h-8 md:w-8 cursor-pointer"
                aria-label="Account"
              >
                <img
                  src={accountLogo}
                  alt="account"
                  className="absolute inset-0 h-full w-full object-contain opacity-100 transition-opacity duration-300 group-hover:opacity-0"
                />
                <img
                  src={accountLogoHover}
                  alt="account hover"
                  className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              </button>
            ) : (
              <a
                href="/signin"
                className="border-2 font-bold border-orange-300 rounded-2xl px-4 py-0.5 transition hover:border-orange-500 hover:text-orange-500 shrink-0"
              >
                Sign in
              </a>
            )}
          </div>
        </nav>
      </header>

      {/* spacer so fixed navbar does not overlap page content */}
      <div />

      <SideMenu />
    </>
  );
}