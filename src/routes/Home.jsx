import { Link } from "react-router-dom";
import { motion as Motion, useReducedMotion } from "framer-motion";
import Navbar from "../components/NavBar.jsx";
import Products from "./Products.jsx";
import Seo from "../components/Seo.jsx";
import { MARKETPLACE_ORIGIN } from "../config/api.js";

const quickLinks = [
  "Replacement parts",
  "Desk organizers",
  "Repair parts",
  "STL files",
  "Cosplay pieces",
  "3D printed gifts",
];

const featureCards = [
  {
    title: "Buy a finished print",
    copy: "Order useful parts, gifts, tools, display pieces, and custom objects made by independent sellers.",
  },
  {
    title: "Download a model file",
    copy: "Find STL and model files you can print yourself when you already have access to a printer.",
  },
  {
    title: "Ask before you order",
    copy: "Message sellers about size, color, material, fit, file details, shipping, or special requirements.",
  },
];

const sellerSteps = [
  "Add your shop name and payout details.",
  "List physical prints, digital files, or both.",
  "Manage orders, questions, and listings in one place.",
];

const previewItems = [
  { title: "Cable clips", type: "Printed part", note: "Ships to buyer" },
  { title: "Headphone stand", type: "Desk object", note: "Made to order" },
  { title: "Wall hook STL", type: "Model file", note: "Instant download" },
];

const marketplaceFaqs = [
  {
    question: "What is sold here?",
    answer:
      "Physical 3D printed products, useful replacement parts, decor, tools, collectibles, prototypes, and downloadable model files from independent sellers.",
  },
  {
    question: "How do I know if it is a print or a file?",
    answer:
      "Each listing should say whether it ships as a physical print, downloads as a model file, or includes both. Check the photos and listing details before checkout.",
  },
  {
    question: "Can I ask a seller a question?",
    answer:
      "Yes. Message the shop about material, sizing, fit, files, color, shipping, or anything specific to that model.",
  },
  {
    question: "Can I sell my own models?",
    answer:
      "Yes. Create a seller account, set up your shop, connect payouts, add listings, and manage orders from the seller area.",
  },
];

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
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: marketplaceFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${MARKETPLACE_ORIGIN}/home`,
      },
    ],
  },
];

const revealContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const Home = ({ user }) => {
  const shouldReduceMotion = useReducedMotion();
  const revealProps = shouldReduceMotion
    ? {}
    : {
        variants: revealContainer,
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, amount: 0.25 },
      };

  return (
    <div className="site-shell min-h-screen overflow-hidden text-emerald-950">
      <Seo
        title="Shop 3D Prints, Parts & Model Files"
        description="Find useful 3D printed products, repair parts, gifts, and downloadable model files from independent sellers on 3Dprintings.xyz."
        path="/home"
        jsonLd={homeJsonLd}
      />
      <Navbar isSignedIn={Boolean(user)} />

      <main id="main-content">
        <section className="relative px-4 pb-16 pt-28 sm:px-6 lg:px-[5vw] lg:pb-20 lg:pt-32" aria-labelledby="home-hero-heading">
          <div className="absolute inset-0 maker-grid opacity-40" aria-hidden="true" />
          <Motion.div
            className="absolute left-[-9rem] top-24 h-96 w-96 rounded-full bg-lime-300/35 blur-3xl"
            animate={shouldReduceMotion ? undefined : { y: [0, 18, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <Motion.div
            className="absolute right-[-8rem] top-20 h-[28rem] w-[28rem] rounded-full bg-orange-300/34 blur-3xl"
            animate={shouldReduceMotion ? undefined : { y: [0, -22, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />

          <Motion.div
            className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center"
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            variants={revealContainer}
          >
            <Motion.div className="max-w-4xl" variants={revealItem}>
              <p className="inline-flex rounded-full border border-emerald-900/10 bg-white/70 px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm backdrop-blur">
                3D prints, parts, and files in one place
              </p>
              <h1 id="home-hero-heading" className="mt-6 text-balance font-display text-5xl font-bold leading-[0.92] tracking-[-0.055em] text-emerald-950 sm:text-6xl lg:text-7xl xl:text-8xl">
                Find useful 3D prints without the guesswork.
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg font-semibold leading-8 text-stone-700 sm:text-xl">
                Buy printed parts, repair pieces, desk objects, gifts, and model files from sellers who explain what you get before you order.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Motion.div whileHover={shouldReduceMotion ? undefined : { y: -3 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}>
                  <Link to="/products" className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-emerald-950 px-7 py-4 text-base font-bold text-white shadow-[0_18px_45px_rgba(6,78,59,0.24)] transition-colors duration-200 hover:bg-red-600 sm:w-auto">
                    Browse 3D prints
                  </Link>
                </Motion.div>
                <Motion.div whileHover={shouldReduceMotion ? undefined : { y: -3 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}>
                  <Link to="/become-seller" className="focus-ring inline-flex w-full items-center justify-center rounded-full border border-emerald-900/15 bg-white/78 px-7 py-4 text-base font-bold text-emerald-950 shadow-sm backdrop-blur transition-colors duration-200 hover:border-red-400 hover:text-red-700 sm:w-auto">
                    Start selling
                  </Link>
                </Motion.div>
              </div>

              <div className="mt-8 flex flex-wrap gap-2" aria-label="Popular searches">
                {quickLinks.map((item) => (
                  <Link key={item} to={`/search?q=${encodeURIComponent(item)}`} className="focus-ring rounded-full border border-emerald-900/10 bg-white/60 px-4 py-2 text-sm font-bold text-emerald-950 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-white">
                    {item}
                  </Link>
                ))}
              </div>
            </Motion.div>

            <Motion.aside
              className="relative"
              variants={revealItem}
              aria-label="Marketplace preview"
            >
              <Motion.div
                className="absolute -left-6 top-10 hidden rounded-full bg-red-500 px-5 py-3 text-sm font-bold text-white shadow-[0_18px_35px_rgba(217,58,47,0.28)] sm:block"
                animate={shouldReduceMotion ? undefined : { y: [0, -12, 0] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
              >
                ready to order
              </Motion.div>
              <Motion.div
                className="absolute -right-4 bottom-16 hidden rounded-full bg-white px-5 py-3 text-sm font-bold text-emerald-950 shadow-[0_18px_45px_rgba(17,24,39,0.13)] sm:block"
                animate={shouldReduceMotion ? undefined : { y: [0, 12, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
              >
                files included
              </Motion.div>

              <div className="overflow-hidden rounded-[3rem] border border-white/70 bg-white/64 p-4 shadow-[0_32px_90px_rgba(6,78,59,0.18)] backdrop-blur-xl">
                <div className="rounded-[2.5rem] bg-emerald-950 p-5 text-white sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-red-200">Today in the marketplace</p>
                      <p className="mt-2 font-display text-3xl font-bold tracking-tight">Clear listings. Simple choices.</p>
                    </div>
                    <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-white/10 text-2xl" aria-hidden="true">
                      3D
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {previewItems.map((item, index) => (
                      <Motion.div
                        key={item.title}
                        className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur"
                        initial={shouldReduceMotion ? false : { opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + index * 0.12, duration: 0.45, ease: "easeOut" }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-display text-xl font-bold">{item.title}</p>
                            <p className="mt-1 text-sm font-semibold text-emerald-50/70">{item.type}</p>
                          </div>
                          <span className="rounded-full bg-red-400/18 px-3 py-1 text-xs font-bold text-red-100">{item.note}</span>
                        </div>
                      </Motion.div>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    {["Prints", "Files", "Shops"].map((item) => (
                      <div key={item} className="rounded-[1.5rem] bg-white px-3 py-4 text-emerald-950">
                        <p className="font-display text-2xl font-bold">{item}</p>
                        <p className="text-xs font-bold text-emerald-700">easy to browse</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Motion.aside>
          </Motion.div>
        </section>

        <Motion.section className="px-4 py-8 sm:px-6 lg:px-[5vw]" aria-label="Fresh marketplace listings" {...revealProps}>
          <Motion.div className="mx-auto max-w-7xl rounded-[3rem] border border-white/70 bg-white/40 p-2 shadow-[0_24px_80px_rgba(6,78,59,0.10)] backdrop-blur" variants={revealItem}>
            <Products
              user={user}
              embedded
              title="Fresh prints and files"
              eyebrow="New in the marketplace"
              description="Browse physical prints, useful fixes, desk objects, collectibles, STL files, and bundles from independent sellers."
            />
          </Motion.div>
        </Motion.section>

        <Motion.section className="px-4 py-14 sm:px-6 lg:px-[5vw]" aria-labelledby="why-shop-heading" {...revealProps}>
          <div className="mx-auto max-w-7xl">
            <Motion.div className="max-w-3xl" variants={revealItem}>
              <p className="text-sm font-bold text-red-700">What you can do here</p>
              <h2 id="why-shop-heading" className="mt-3 text-balance font-display text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                Pick the option that fits how you print.
              </h2>
            </Motion.div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featureCards.map((item) => (
                <Motion.article
                  key={item.title}
                  variants={revealItem}
                  whileHover={shouldReduceMotion ? undefined : { y: -8, scale: 1.01 }}
                  className="rounded-[2.5rem] border border-white/70 bg-white/72 p-6 shadow-[0_18px_55px_rgba(6,78,59,0.09)] backdrop-blur"
                >
                  <h3 className="font-display text-2xl font-bold tracking-tight text-emerald-950">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-stone-600">{item.copy}</p>
                </Motion.article>
              ))}
            </div>
          </div>
        </Motion.section>

        <Motion.section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-labelledby="seller-heading" {...revealProps}>
          <Motion.div className="mx-auto grid max-w-7xl gap-6 overflow-hidden rounded-[3rem] border border-emerald-900/15 bg-emerald-950 p-6 text-white shadow-[0_28px_80px_rgba(6,78,59,0.22)] md:grid-cols-[1fr_0.8fr] md:p-8 lg:p-10" variants={revealItem}>
            <div className="relative z-10">
              <p className="text-sm font-bold text-red-200">For sellers</p>
              <h2 id="seller-heading" className="mt-3 text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Open a simple shop for your prints and files.
              </h2>
              <p className="mt-5 max-w-2xl text-pretty text-base font-semibold leading-8 text-white/75">
                Add clear photos, prices, materials, dimensions, stock, and shipping details so buyers know exactly what they are ordering.
              </p>
              <Motion.div className="mt-7 inline-flex" whileHover={shouldReduceMotion ? undefined : { y: -3 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}>
                <Link to="/become-seller" className="focus-ring inline-flex rounded-full bg-red-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition-colors duration-200 hover:bg-red-400">
                  Open your shop
                </Link>
              </Motion.div>
            </div>
            <div className="grid gap-3 self-center">
              {sellerSteps.map((item) => (
                <Motion.div key={item} className="rounded-[2rem] border border-white/10 bg-white/8 p-5 text-lg font-bold text-white backdrop-blur" variants={revealItem}>
                  {item}
                </Motion.div>
              ))}
            </div>
          </Motion.div>
        </Motion.section>

        <Motion.section className="px-4 py-14 sm:px-6 lg:px-[5vw]" aria-labelledby="faq-heading" {...revealProps}>
          <div className="mx-auto max-w-7xl">
            <Motion.div className="max-w-3xl" variants={revealItem}>
              <p className="text-sm font-bold text-red-700">Quick answers</p>
              <h2 id="faq-heading" className="mt-3 text-balance font-display text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                Before you buy or sell
              </h2>
            </Motion.div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {marketplaceFaqs.map((item) => (
                <Motion.article key={item.question} variants={revealItem} className="rounded-[2.5rem] border border-white/70 bg-white/70 p-6 shadow-[0_14px_45px_rgba(6,78,59,0.08)] backdrop-blur">
                  <h3 className="font-display text-2xl font-bold tracking-tight text-emerald-950">{item.question}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-stone-600">{item.answer}</p>
                </Motion.article>
              ))}
            </div>
          </div>
        </Motion.section>
      </main>
    </div>
  );
};

export default Home;
