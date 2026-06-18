import LandingPage from "../components/LandingPage.jsx";
import Navbar from "../components/NavBar.jsx";
import Seo from "../components/Seo.jsx";
import { MARKETPLACE_ORIGIN } from "../config/api.js";
import Products from "./Products.jsx";

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "3Dprintings.xyz",
    url: MARKETPLACE_ORIGIN,
    potentialAction: {
      "@type": "SearchAction",
      target: `${MARKETPLACE_ORIGIN}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "3Dprintings.xyz",
    url: MARKETPLACE_ORIGIN,
    logo: `${MARKETPLACE_ORIGIN}/favicon.svg`,
  },
];

const Home = ({ user }) => {
  return (
    <>
      <Seo
        title="Buy Physical 3D Prints & Download Model Files"
        description="3Dprintings.xyz is a marketplace for physical 3D printed products, useful replacement parts, custom maker goods, and downloadable 3D model files."
        path="/home"
        jsonLd={homeJsonLd}
      />
      <Navbar isSignedIn={Boolean(user)} />
      <LandingPage />
      <section className="bg-[#e7f3df] px-4 pb-20 pt-8 transition-colors duration-300 dark:bg-neutral-950 sm:px-6 lg:px-[5vw]">
        <div className="mx-auto max-w-7xl">
          <Products
            user={user}
            embedded
            title="Fresh products from the marketplace"
            eyebrow="Latest listings"
            description="Browse physical 3D printed products and downloadable model files from independent sellers."
          />
        </div>
      </section>
    </>
  );
};

export default Home;
