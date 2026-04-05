import {useRef, useState, useEffect} from "react";
import accountLogo from "../assets/accountLogo.svg"
import accountLogoHover from "../assets/accountLogoHover.svg"
import Search from "../assets/search.svg"
export default function Navbar() {
      const [showNavbar, setShowNavbar] = useState(true);
      const lastScrollY = useRef(0);

    function showNavBar() {
      const currentScrollY = window.scrollY
      if (currentScrollY > window.innerHeight) {
        if (currentScrollY - lastScrollY.current > 5){
          setShowNavbar(false)
        } else if (currentScrollY - lastScrollY.current < -5) {
          setShowNavbar(true)
        }
    }      else {setShowNavbar(true)}
        lastScrollY.current = currentScrollY
    }

    useEffect(() => {
  window.addEventListener("scroll", showNavBar);

  return () => {
    window.removeEventListener("scroll", showNavBar);
  };
}, []);

  return (
<header className={`fixed top-0 left-0 w-full z-50 bg-gray-950 shadow-sm border-b border-gray-200 transition-transform duration-300 ${showNavbar ? "translate-y-0" : "-translate-y-full"}`}>
  <nav className="mx-auto flex max-w-7xl items-center justify-center  py-3">
        <a href='/home' className="text-xl font-extrabold text-white flex gap-2 transition hover:text-orange-500 pr-3">
            3z
        </a>
      <a href="#" className="hidden md:block text-white pr-4 transition hover:text-orange-500">
              Home
            </a>
      <div className="sm:w-2/5 md:w-2.5/5 lg:w-3/5 xl:w-4/5 text-white">
<div className="relative w-full overflow-hidden rounded-full border-2 border-gray-300">
  <input
    type="text"
    placeholder="Search"
    className="w-full bg-transparent px-4 py-2 pr-24 outline-none"
  />
  <button className="absolute right-0 top-0 h-full bg-orange-500 px-3 text-white">
      <img src={Search} alt="Search" />
  </button>
</div>
      </div>
      <div>
<button className="group flex cursor-pointer flex-col gap-1 px-4">
  <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
  <span className="h-0.5 w-6 bg-white transition group-hover:bg-white"></span>
  <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
</button>
</div>
   <div>
<button className="group relative h-8 w-8">
  <img
    src={accountLogo}
    alt="account"
    className="absolute inset-0 h-full w-full opacity-100 transition-opacity duration-300 group-hover:opacity-0"
  />
  <img
    src={accountLogoHover}
    alt="account hover"
    className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
  />
</button>
   </div>
      </nav>
    </header>
  );
}