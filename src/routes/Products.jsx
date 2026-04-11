import React from 'react'
import ProductCard from "../components/ProductCard.jsx";
import Navbar from "../components/NavBar.jsx";

const Products = ({NoNavBarLimit}) => {
    return (
        <>
            <Navbar isSingedIn={false} NoNavBarLimit={NoNavBarLimit}/>
        <main className={"px-4 lg:px-[5vw] bg-[#f2f2f2]"}>
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4 my-21">
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts dcsdc sddsc sdc dsc sdc sc s cs csd csd csd csd c sdc sdc ds grb frv gfv "} rating={"5"} currentPrice={"80"} originalPrice={"200"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"80"} originalPrice={"200"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"120"} originalPrice={"400"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"dihh"} rating={"3.2"} currentPrice={"120"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"80"} originalPrice={"200"} reviewNumber={"249"}/>
              <ProductCard creatorName={"Parsa"} productName={"3d printed parts"} rating={"5"} currentPrice={"80"} originalPrice={"200"} reviewNumber={"249"}/>
              <ProductCard />
          </div>
          </main>
         </>
    )}
export default Products
