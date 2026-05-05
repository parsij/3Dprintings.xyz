import React from "react";
import bgImage from "../assets/background.png";
import Products from "./Products.jsx";
const home = ({ user }) => {
  return (
      <div className="min-h-screen bg-[#fffefc]">
          <main className="w-full">
              <div className="relative w-full">
                  <div className={"justify-center content-center items-center"}>
                      <img
                      src={bgImage}
                      alt="Marketplace hero"
                      className="block w-full h-screen object-cover "/>
                      </div>

                  <div
                      className="absolute flex items-center justify-center text-center animate-fade-in-up"
                      style={{
                          left: "64.7%",
                          top: "8.3%",
                          width: "28.8%",
                          height: "84.3%",
                      }}
                  >
                      <h1 className="text-[clamp(1.2rem,4vw,5rem)] font-black leading-[1.15] text-black hover:scale-105 transition-transform duration-500 cursor-default">
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
          <Products user={user} NoNavBarLimit={false}/>
      </div>
  );
};

export default home;