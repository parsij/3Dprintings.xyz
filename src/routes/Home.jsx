import React from "react";
import Navbar from "../components/NavBar.jsx";
import bgImage from "../assets/background.png";
import ProductCard from "../components/ProductCard.jsx";
const home = () => {
  return (
      <div className="min-h-screen bg-[#fffefc]">
          <div className={""}>
          <Navbar isSingedIn={false}/>
          </div>
          <main className="w-full">
              <div className="relative w-full">
                  <div className={"justify-center content-center items-center"}>
                      <img
                      src={bgImage}
                      alt="Marketplace hero"
                      className="block w-full h-screen object-cover "/>
                      </div>

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
          <main className={"px-4 lg:px-[5vw]"}>
<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts dcsdc sddsc sdc dsc sdc sc s cs csd csd csd csd c sdc sdc ds grb frv gfv "} rating={"5"} currentPrice={"80"} originalPrice={"200"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"80"} originalPrice={"200"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"dihh"} rating={"3.2"} currentPrice={"120"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"80"} originalPrice={"200"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"80"} originalPrice={"200"} reviewNumber={"249"}/>
              <ProductCard />
          </div>
          </main>
      </div>
  );
};

export default home;