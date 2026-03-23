import React from "react";
import "./App.css";
import Navbar from "./components/NavBar.jsx";
import bgImage from "./assets/background.png";
import ProductCard from "./components/ProductCard.jsx";
const App = () => {
  return (
      <div className="min-h-screen bg-[#efefef]">
          <Navbar/>

          <main className="w-full">
              <div className="relative w-full">
                  <img
                      src={bgImage}
                      alt="Marketplace hero"
                      className="block h-auto w-full"
                  />

                  <div
                      className="absolute flex items-center justify-center text-center"
                      style={{
                          left: "64.7%",
                          top: "8.3%",
                          width: "28.8%",
                          height: "84.3%",
                      }}
                  >
                      <h1 className="text-[clamp(1.2rem,4vw,5rem)] font-black leading-[1.15] text-black">
                          The Only
                          <br/>
                          Marketplace
                          <br/>
                          you need
                          <br/>
                          for 3D
                          <br/>
                          Printed
                          <br/>
                          Parts
                      </h1>
                  </div>
              </div>
          </main>
          <div className="bg-black md:p-10 min-h-screen p-6">
              <div className="mx-auto max-w-7xl">
                  <div className="mb-8 items-center justify-between flex">
                      <div>
                          <h1 className="text-2xl font-semibold text-white mb-1">Handcrafted Finds</h1>
                          <p className="text-sm text-neutral-400">Discover unique items made with love</p>
                      </div>
                      <div className="items-center flex gap-2">
                          <span className="text-xs text-neutral-500">2,400+ results</span>
                          <div
                              className="items-center bg-neutral-900 rounded-lg px-3 py-2 flex gap-1 border border-neutral-800">
                              <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor"
                                   viewBox="0 0 24 24" id="Windframe_rBeXkqLqJ">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"></path>
                              </svg>
                              <span className="text-xs text-neutral-300 font-medium">Filter</span>
                          </div>
                      </div>
                  </div>
                  <div className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid grid-cols-1 gap-5">
                      <ProductCard
                          imgSrc="https://placehold.co/400x400/1a1a1a/ffffff?text=Handmade+Vase"
                          imgAlt="Handmade Ceramic Vase"
                          tagName="Bestseller"
                          tagColor="bg-neutral-800/80 text-neutral-300"
                          creatorInitial="A"
                          creatorName="ArtisanClayStudio"
                          productName="Handcrafted Ceramic Vase – Minimalist Stoneware, 6 inch"
                          rating="(4.2)"
                          reviewCount="312 reviews"
                          currentPrice="$38.00"
                          originalPrice="$52.00"
                      />
                      <ProductCard
                          imgSrc="https://placehold.co/400x400/1c1c1c/ffffff?text=Macrame+Wall+Art"
                          imgAlt="Macrame Wall Hanging"
                          tagName="Sale"
                          tagColor="bg-rose-950/80 text-rose-400"
                          creatorInitial="B"
                          creatorName="BohoKnotCo"
                          productName="Large Macrame Wall Hanging – Boho Home Decor, Natural Cotton"
                          rating="(5.0)"
                          reviewCount="1,024 reviews"
                          currentPrice="$64.50"
                          originalPrice="$85.00"
                      />
                      <ProductCard
                          imgSrc="https://placehold.co/400x400/181818/ffffff?text=Leather+Journal"
                          imgAlt="Handmade Leather Journal"
                          tagName="Made to Order"
                          tagColor="bg-neutral-800/80 text-neutral-300"
                          creatorInitial="C"
                          creatorName="CraftedLeatherCo"
                          productName="Personalized Leather Journal – A5, Custom Initials, Handstitched"
                          rating="(4.8)"
                          reviewCount="789 reviews"
                          currentPrice="$45.99"
                          originalPrice=""
                      />
                      <ProductCard
                          imgSrc="https://placehold.co/400x400/202020/ffffff?text=Soy+Candle"
                          imgAlt="Soy Candle"
                          tagName="Eco Friendly"
                          tagColor="bg-emerald-950/80 text-emerald-400"
                          creatorInitial="W"
                          creatorName="WarmWickWorks"
                          productName="Hand-Poured Soy Candle – Lavender & Eucalyptus, 8oz Glass Jar"
                          rating="(4.6)"
                          reviewCount="2,104 reviews"
                          currentPrice="$22.00"
                          originalPrice=""
                      />
                      <ProductCard
                          imgSrc="https://placehold.co/400x400/1e1e1e/ffffff?text=Knitted+Scarf"
                          imgAlt="Knitted Scarf"
                          tagName="Bestseller"
                          tagColor="bg-neutral-800/80 text-neutral-300"
                          creatorInitial="K"
                          creatorName="KnitsByKlara"
                          productName="Hand-Knitted Merino Wool Scarf – Chunky, 70 inch, Unisex"
                          rating="(4.5)"
                          reviewCount="537 reviews"
                          currentPrice="$58.00"
                          originalPrice="$72.00"
                      />
                      <ProductCard
                          imgSrc="https://placehold.co/400x400/161616/ffffff?text=Watercolor+Print"
                          imgAlt="Watercolor Art Print"
                          tagName="Digital Download"
                          tagColor="bg-violet-950/80 text-violet-400"
                          creatorInitial="S"
                          creatorName="StudioSolstice"
                          productName="Abstract Watercolor Botanical Print – Instant Download, 5 sizes"
                          rating="(5.0)"
                          reviewCount="3,891 reviews"
                          currentPrice="$8.99"
                          originalPrice=""
                      />
                      <ProductCard
                          imgSrc="https://placehold.co/400x400/191919/ffffff?text=Resin+Earrings"
                          imgAlt="Resin Earrings"
                          tagName="Handmade"
                          tagColor="bg-neutral-800/80 text-neutral-300"
                          creatorInitial="L"
                          creatorName="LunaResinArt"
                          productName="Handmade Resin Drop Earrings – Galaxy Blue, Stainless Steel Hooks"
                          rating="(4.7)"
                          reviewCount="621 reviews"
                          currentPrice="$18.50"
                          originalPrice=""
                      />
                      <ProductCard
                          imgSrc="https://placehold.co/400x400/171717/ffffff?text=Wood+Cutting+Board"
                          imgAlt="Wood Cutting Board"
                          tagName="Free Shipping"
                          tagColor="bg-amber-950/80 text-amber-400"
                          creatorInitial="R"
                          creatorName="RusticGrainWorks"
                          productName="Custom Engraved Walnut Cutting Board – Personalized Wedding Gift"
                          rating="(5.0)"
                          reviewCount="4,210 reviews"
                          currentPrice="$74.00"
                          originalPrice="$95.00"
                      />
                  </div>
                  <div className="mt-10 items-center justify-center flex">
                      <button type="submit"
                              className="flex gap-2 hover:bg-neutral-800 border border-neutral-700/70 hover:border-neutral-600 hover:text-white transition-all duration-150 items-center bg-neutral-900 text-neutral-300 text-sm font-medium px-6 py-2.5 rounded-lg">
                          Load more
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                               id="Windframe_5uGEHHMuq">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 9l-7 7-7-7"></path>
                          </svg>
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default App;