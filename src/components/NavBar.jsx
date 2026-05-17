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

    if (currentScrollY > window.innerHeight || NoNavBarLimit) {
      if (currentScrollY - lastScrollY.current > 7) {
        setShowNavbar(false);
      } else if (currentScrollY - lastScrollY.current < -7) {
        setShowNavbar(true);
      }
    } else {
      setShowNavbar(true);
    }

    lastScrollY.current = currentScrollY;
  }, [NoNavBarLimit]);

  useEffect(() => {
    window.addEventListener("scroll", showNavBar);
    return () => {
      window.removeEventListener("scroll", showNavBar);
    };
  }, [showNavBar]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput)}`);
      setSearchInput("");
    }
  };

  return (
      <>
        <header
            className={`fixed top-0 left-0 w-full z-50 bg-black/65 backdrop-blur-xs shadow-sm border-b border-white/20 text-white transition-transform duration-300 ${
                showNavbar ? "translate-y-0" : "-translate-y-full"
            }`}
        >
          {/* Adjusted padding to use fluid 5vw on desktops to align perfectly with the edge of the screen */}
          <nav className="flex items-center justify-between w-full px-4 lg:px-[5vw] py-3">

            {/* LEFT CONTAINER: Menu Button is isolated and stays completely on the far left */}
            <div className="flex items-center flex-1 min-w-0">
              <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="group flex cursor-pointer flex-col gap-1 shrink-0"
                  aria-label="Open menu"
              >
                <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
                <span className="h-0.5 w-6 bg-white transition group-hover:bg-white"></span>
                <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
              </button>
            </div>

            {/* MIDDLE CONTAINER: Logo, Links, and Search Bar sit comfortably in the center */}
            <div className="flex items-center justify-center gap-4 md:gap-6 flex-[3] max-w-4xl min-w-0">
              {/* Logo */}
              <Link
                  to="/home"
                  className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-white text-xl font-extrabold transition hover:text-orange-500 hover:border-orange-500 shrink-0"
              >
                3z
              </Link>

              {/* Products */}
              <Link
                  to={"/products"}
                  className="font-bold hidden md:block transition hover:text-orange-500 shrink-0"
              >
                Products
              </Link>

              {/* Search Bar */}
              <div className="w-full max-w-xl min-w-0">
                <form onSubmit={handleSearch} className="relative w-full overflow-hidden rounded-full border-2 border-gray-300 transition focus-within:border-orange-500 bg-black/20">
                  <input
                      type="text"
                      placeholder="Search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full bg-transparent text-white placeholder:text-gray-300 px-4 py-2 pr-14 md:pr-16 outline-none"
                  />
                  <button
                      type="submit"
                      className="absolute right-0 top-0 h-full bg-white px-3 transition hover:bg-orange-500 cursor-pointer flex items-center justify-center"
                  >
                    <img src={Search} alt="Search" className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT CONTAINER: Profile and Cart elements stay anchored to the far right */}
            <div className="flex items-center justify-end gap-3 md:gap-5 flex-1 shrink-0">
              <div className="shrink-0 flex items-center justify-center">
                {isSignedIn ? (
                    <Link
                        to="/account"
                        className="group relative inline-flex h-6 w-6 md:h-8 md:w-8 items-center justify-center cursor-pointer"
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
                    </Link>
                ) : (
                    <Link
                        to="/signup"
                        className="border-2 font-bold border-orange-300 rounded-2xl px-4 py-0.5 transition hover:border-orange-500 hover:text-orange-500 shrink-0 whitespace-nowrap"
                    >
                      Sign Up
                    </Link>
                )}
              </div>

              <Link
                  to="/cart"
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
              </Link>
            </div>

          </nav>
        </header>

        <div />

        <SideMenu />
      </>
  );
}