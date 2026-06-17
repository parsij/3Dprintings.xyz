import LandingPage from "../components/LandingPage.jsx";
import Navbar from "../components/NavBar.jsx";
import Seo from "../components/Seo.jsx";
import { MARKETPLACE_ORIGIN } from "../config/api.js";

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
    </>
  );
};

export default Home;
