export default function Navbar() {
  return (
    <header className="w-full bg-gray-950 shadow-sm border-b border-gray-200">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="text-xl font-bold text-white">
          3DPrintings.xyz
        </div>

        <ul className="hidden gap-6 text-white md:flex">
          <li>
            <a href="#" className="transition hover:text-green-600">
              Home
            </a>
          </li>
          <li>
            <a href="#" className="transition hover:text-green-600">
              Become a Seller
            </a>
          </li>
          <li>
            <a href="#" className="transition hover:text-green-600">
              Log in
            </a>
          </li>
        </ul>

        <button className=" cursor-pointer rounded-lg bg-orange-600 px-4 py-2 text-white transition hover:bg-orange-800">
          Sign Up
        </button>
      </nav>
    </header>
  );
}