import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import bgImage from "../assets/background-hero.webp";
import Navbar from "../components/NavBar.jsx";
import Products from "./Products.jsx";
import Seo from "../components/Seo.jsx";
import { MARKETPLACE_ORIGIN } from "../config/api.js";

const revealContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  },
};

const trustSignals = [
  "Physical Prints",
  "Digital Files",
  "Independent Sellers",
  "Secure Checkout",
];

const buyerSteps = [
  {
    title: "Find The Thing You Need",
    copy: "Search useful parts, decor, accessories, prototypes, replacement pieces, and ready-to-print files.",
  },
  {
    title: "Check The Listing Details",
    copy: "Review photos, materials, seller notes, file type, stock, price, reviews, and shipping expectations before buying.",
  },
  {
    title: "Order With Confidence",
    copy: "Add products to cart, message the shop when needed, and track the order from purchase to delivery.",
  },
];

const sellerCards = [
  "Sell finished 3D printed products.",
  "Offer downloadable model files.",
  "Manage orders, messages, payouts, and reviews.",
];

const marketplaceFaqs = [
  {
    question: "What can I buy on 3Dprintings.xyz?",
    answer:
      "You can buy physical 3D printed products, useful replacement parts, decor, tools, collectibles, prototypes, and downloadable 3D model files from independent makers.",
  },
  {
    question: "Are listings physical products, digital files, or both?",
    answer:
      "Each listing should explain whether it is a shipped physical print, a downloadable model file, or a bundle that includes both. Check the listing details before checkout.",
  },
  {
    question: "Can I message a seller before buying?",
    answer:
      "Yes. Product and shop messaging helps buyers ask about materials, fit, files, shipping expectations, and other listing-specific details before or after an order.",
  },
  {
    question: "How do makers sell on the marketplace?",
    answer:
      "Makers can create a seller account, set up their shop, connect payouts, configure shipping details, and publish listings for physical prints, model files, or creator bundles.",
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

const Home = ({ user }) => {
  return (
    <div className="site-shell min-h-screen overflow-hidden text-gray-900">
      <Seo
        title="Buy Physical 3D Prints & Download Model Files"
        description="3Dprintings.xyz is a marketplace for physical 3D printed products, useful replacement parts, custom maker goods, and downloadable 3D model files."
        path="/home"
        jsonLd={homeJsonLd}
      />
      <Navbar isSignedIn={Boolean(user)} />

      <main id="main-content">
        <section className="relative min-h-screen px-4 pb-20 pt-32 sm:px-6 lg:px-[5vw] lg:pt-36" aria-labelledby="home-hero-heading">
          <div className="absolute inset-0 maker-grid opacity-70" aria-hidden="true" />
          <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-300/35 blur-3xl lg:left-[18%] lg:h-96 lg:w-96" aria-hidden="true" />
          <div className="absolute bottom-16 right-[-8rem] h-96 w-96 rounded-full bg-gray-950/10 blur-3xl" aria-hidden="true" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <Motion.div variants={revealContainer} initial="hidden" animate="visible" className="max-w-4xl">
              <Motion.p variants={revealItem} className="inline-flex rounded-full border border-orange-200 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-orange-800 shadow-sm backdrop-blur">
                Built For Prints, Files, And Makers
              </Motion.p>
              <Motion.h1 id="home-hero-heading" variants={revealItem} className="mt-6 text-balance font-display text-5xl font-black tracking-[-0.05em] text-gray-950 sm:text-6xl lg:text-7xl xl:text-8xl">
                You Need It. A Maker Can Print It.
              </Motion.h1>
              <Motion.p variants={revealItem} className="mt-6 max-w-2xl text-pretty text-lg font-semibold leading-8 text-gray-600 sm:text-xl">
                Shop real 3D printed products and ready-to-print files from independent creators. From practical replacement parts to displayable objects, the marketplace helps you move from “I need that” to “it’s on the way.”
              </Motion.p>

              <Motion.div variants={revealItem} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/products" className="focus-ring inline-flex items-center justify-center rounded-2xl bg-gray-950 px-7 py-4 text-base font-black text-white shadow-[0_18px_48px_rgba(17,24,39,0.22)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-orange-600">
                  Shop The Marketplace
                </Link>
                <Link to="/become-seller" className="focus-ring inline-flex items-center justify-center rounded-2xl border border-orange-300 bg-white/80 px-7 py-4 text-base font-black text-gray-950 shadow-sm backdrop-blur transition-[border-color,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-orange-500 hover:bg-white">
                  Start Selling
                </Link>
              </Motion.div>

              <Motion.div variants={revealItem} className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {trustSignals.map((signal) => (
                  <div key={signal} className="rounded-2xl border border-orange-100 bg-white/72 px-4 py-3 text-sm font-black text-gray-700 shadow-sm backdrop-blur">
                    {signal}
                  </div>
                ))}
              </Motion.div>
            </Motion.div>

            <Motion.div initial={{ opacity: 0, y: 30, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute -left-6 -top-6 h-28 w-28 rounded-[2rem] bg-orange-400/30 blur-xl" aria-hidden="true" />
              <div className="absolute -bottom-7 -right-7 h-36 w-36 rounded-full bg-gray-950/20 blur-2xl" aria-hidden="true" />

              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-gray-950 p-4 shadow-[0_34px_100px_rgba(17,24,39,0.28)]">
                <div className="overflow-hidden rounded-[2rem] bg-orange-50">
                  <img
                    src={bgImage}
                    alt="A curated 3D printing marketplace hero scene"
                    width="900"
                    height="900"
                    fetchPriority="high"
                    className="aspect-square h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-x-7 bottom-7 rounded-[1.5rem] border border-white/20 bg-gray-950/82 p-5 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Marketplace Signal</p>
                  <p className="mt-2 font-display text-2xl font-black tracking-tight">Prints you can hold. Files you can make.</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/68">A storefront for actual printed goods, digital downloads, and seller conversations when the part needs context.</p>
                </div>
              </div>
            </Motion.div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-labelledby="how-it-works-heading">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">How It Works</p>
                <h2 id="how-it-works-heading" className="mt-3 text-balance font-display text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                  The Site Should Feel Like A Helpful Shop Assistant.
                </h2>
              </div>
              <p className="text-pretty text-lg font-semibold leading-8 text-gray-600">
                Every section points users toward the next decision: what they can buy, what the seller provides, how checkout works, and where to go if they want to sell their own prints or files.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {buyerSteps.map((step, index) => (
                <Motion.article
                  key={step.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                  className="rounded-[2rem] border border-orange-100 bg-white/82 p-6 shadow-[0_18px_60px_rgba(17,24,39,0.08)] backdrop-blur"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-950 font-display text-lg font-black text-orange-300">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-black tracking-tight text-gray-950">{step.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-gray-600">{step.copy}</p>
                </Motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-labelledby="seller-heading">
          <div className="mx-auto grid max-w-7xl gap-6 overflow-hidden rounded-[2.4rem] border border-gray-900/10 bg-gray-950 p-6 text-white shadow-[0_30px_90px_rgba(17,24,39,0.24)] md:grid-cols-[1fr_0.85fr] md:p-8 lg:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">For Sellers</p>
              <h2 id="seller-heading" className="mt-3 text-balance font-display text-4xl font-black tracking-tight sm:text-5xl">
                Turn Your Print Bench Into A Storefront.
              </h2>
              <p className="mt-5 max-w-2xl text-pretty text-base font-semibold leading-8 text-white/70">
                List finished products, downloadable files, or both. Keep the onboarding focused: name the shop, connect payouts, publish the first listing, then keep improving from the seller dashboard.
              </p>
              <Link to="/become-seller" className="focus-ring mt-7 inline-flex rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-950/20 transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-orange-400">
                Open Seller Setup
              </Link>
            </div>
            <div className="grid gap-3 self-center">
              {sellerCards.map((item, index) => (
                <Motion.div
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="rounded-3xl border border-white/10 bg-white/8 p-5 text-lg font-black text-white backdrop-blur"
                >
                  {item}
                </Motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">Marketplace Questions</p>
              <h2 id="faq-heading" className="mt-3 text-balance font-display text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                Clear Answers Before You Buy Or Sell.
              </h2>
              <p className="mt-4 text-pretty text-base font-semibold leading-8 text-gray-600">
                The marketplace is built for both finished 3D printed goods and digital model files, so the important details should be visible before a user commits.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {marketplaceFaqs.map((item, index) => (
                <Motion.article
                  key={item.question}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
                  className="rounded-[2rem] border border-orange-100 bg-white/82 p-6 shadow-[0_18px_60px_rgba(17,24,39,0.08)] backdrop-blur"
                >
                  <h3 className="font-display text-2xl font-black tracking-tight text-gray-950">{item.question}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-gray-600">{item.answer}</p>
                </Motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-label="Featured marketplace listings">
          <div className="mx-auto max-w-7xl">
            <Products
              user={user}
              embedded
              title="Fresh From The Print Beds"
              eyebrow="Live Listings"
              description="Start with what sellers are publishing now. The catalog supports practical parts, finished prints, collectibles, decor, tools, files, and creator bundles."
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
