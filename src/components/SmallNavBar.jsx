import React from 'react'

export const SmallNavBar = () => {
    return (
         <div className="fixed top-0 left-0 w-full z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <a href="/home" className="text-xl font-extrabold text-white hover:text-orange-500 transition">
          3z
        </a>

        <a className={"text-white font-bold transition hover:text-orange-500"} href={"/home"} >3Dprintings.xyz</a>
        <div>
      <button onClick={() => setMenuOpen(prev => !prev)} className="group flex cursor-pointer flex-col gap-1 px-4">
        <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
        <span className="h-0.5 w-6 bg-white transition group-hover:bg-white"></span>
        <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
      </button>
      </div>
      </nav>
    </div>
    )
}
export default SmallNavBar;