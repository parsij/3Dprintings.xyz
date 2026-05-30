import React from 'react'
import { useMenu } from '../../MenuContext.jsx'

const SellerNavBar = ({pageName}) => {
    const { setMenuOpen } = useMenu();
    return (
        <div className="fixed top-0 left-0 w-full z-50 bg-black/65 backdrop-blur-xs shadow-sm border-b border-white/20 text-white">
            {/* Added full width layout and fluid padding to align beautifully on all viewports */}
            <nav className="flex items-center justify-between w-full px-4 lg:px-[5vw] py-3">

                {/* 1. LEFT BLOCK: Menu Button isolated and locked to the far left */}
                <div className="flex items-center flex-1 min-w-0">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className="group flex cursor-pointer flex-col gap-1"
                        aria-label="Open menu"
                    >
                        {/* Swapped bg-gray-800 to bg-white so your bars are visible on the dark background */}
                        <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
                        <span className="h-0.5 w-6 bg-white transition group-hover:bg-white"></span>
                        <span className="h-0.5 w-6 bg-white transition group-hover:bg-orange-500"></span>
                    </button>
                </div>

                {/* 2. CENTER BLOCK: Page Name stays centered */}
                <div className="flex items-center justify-center font-bold text-lg max-w-4xl min-w-0">
                    {pageName}
                </div>

                {/* 3. RIGHT BLOCK: Invisible spacer to force perfect center symmetry */}
                <div className="flex-1 shrink-0 invisible" aria-hidden="true" />

            </nav>
        </div>
    )
}
export default SellerNavBar