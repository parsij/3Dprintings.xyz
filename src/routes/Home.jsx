import { Link } from "react-router-dom";
import { motion as Motion, useReducedMotion } from "framer-motion";
import Navbar from "../components/NavBar.jsx";
import Products from "./Products.jsx";
import Seo from "../components/Seo.jsx";
import { MARKETPLACE_ORIGIN } from "../config/api.js";

const searchPills = [
  "Replacement parts",
  "Desk pieces",
  "Printer upgrades",
  "STL files",
  "Gift ideas",
  "Home fixes",
];

const waysToShop = [
  {
    step: "01",
    title: "Shop it",
    copy: "Buy a finished 3D print and have it shipped to you.",
  },
  {
    step: "02",
    title: "Print it",
    copy: "Download a file and print it on your own printer.",
  },
  {
    step: "03",
    title: "Ask first",
    copy: "Message the seller about size, color, material, or fit before you order.",
  },
];

const floatingItems = [
  { label: "Repair clip", detail: "ready to ship", className: "left-2 top-8 rotate-[-5deg]" },
  { label: "Tool holder", detail: "made to order", className: "right-0 top-28 rotate-[6deg]" },
  { label: "STL file", detail: "download", className: "bottom-10 left-10 rotate-[4deg]" },
];

const sellerPoints = [
  "Sell printed products, digital files, or both.",
  "Show price, material, size, stock, and shipping clearly.",
  "Manage listings and orders from your seller dashboard.",
];

const marketplaceFaqs = [
  {
    question: "What can I buy here?",
    answer:
      "You can buy physical 3D printed products, replacement parts, decor, tools, collectibles, prototypes, gifts, and downloadable model files.",
  },
  {
    question: "How do I know what I will receive?",
    answer:
      "Each listing should say if you are buying a shipped print, a downloadable file, or both. Check the photos, description, material, and delivery details before checkout.",
  },
  {
    question: "Can I contact the seller?",
    answer:
      "Yes. You can ask about sizing, color, material, files, shipping, or whether an item will work for your use case.",
  },
  {
    question: "Can I sell my own 3D prints?",
    answer:
      "Yes. Create a seller account, add your shop details, connect payouts, and publish your first listing.",
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
      staggerChildren: 0.12,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const Home = ({ user }) => {
  const shouldReduceMotion = useReducedMotion();
  const scrollReveal = shouldReduceMotion
    ? {}
    : {
        variants: revealContainer,
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, amount: 0.22 },
      };

  return (
    <div className="min-h-screen overflow-hidden bg-[#edf4e6] text-emerald-950">
      <Seo
        title="Shop 3D Prints, Parts & Model Files"
        description="Shop ready-made 3D prints or download model files to print yourself on 3Dprintings.xyz."
        path="/home"
        jsonLd={homeJsonLd}
      />
      <Navbar isSignedIn={Boolean(user)} />

      <main id="main-content">
        <section className="relative px-4 pb-16 pt-28 sm:px-6 lg:px-[5vw] lg:pb-20 lg:pt-32" aria-labelledby="home-hero-heading">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(217,58,47,0.18),transparent_30rem),radial-gradient(circle_at_78%_14%,rgba(132,169,71,0.24),transparent_28rem),linear-gradient(180deg,#edf4e6_0%,#f8fbf2_62%,#e2eed7_100%)]" aria-hidden="true" />
          <div className="absolute left-0 right-0 top-32 mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-emerald-900/20 to-transparent" aria-hidden="true" />

          <Motion.div
            className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center"
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            variants={revealContainer}
          >
            <Motion.div variants={revealItem}>
              <p className="inline-flex rounded-full border border-emerald-900/10 bg-white/75 px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm backdrop-blur">
                Buy a print or download a file
              </p>
              <h1 id="home-hero-heading" className="mt-7 max-w-5xl text-balance font-display text-5xl font-bold leading-[0.92] tracking-[-0.055em] text-emerald-950 sm:text-6xl lg:text-7xl xl:text-8xl">
                3D printed things for real life.
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg font-semibold leading-8 text-stone-700 sm:text-xl">
                Find useful parts, small fixes, desk pieces, gifts, and files you can print yourself. Clear listings tell you what you are buying before you pay.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Motion.div whileHover={shouldReduceMotion ? undefined : { y: -3 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}>
                  <Link to="/products" className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-emerald-950 px-7 py-4 text-base font-bold text-white shadow-[0_18px_45px_rgba(6,78,59,0.24)] transition-colors duration-200 hover:bg-red-600 sm:w-auto">
                    Shop 3D prints
                  </Link>
                </Motion.div>
                <Motion.div whileHover={shouldReduceMotion ? undefined : { y: -3 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}>
                  <Link to="/become-seller" className="focus-ring inline-flex w-full items-center justify-center rounded-full border border-emerald-900/15 bg-white/80 px-7 py-4 text-base font-bold text-emerald-950 shadow-sm backdrop-blur transition-colors duration-200 hover:border-red-400 hover:text-red-700 sm:w-auto">
                    Sell your work
                  </Link>
                </Motion.div>
              </div>

              <div className="mt-9 flex flex-wrap gap-2" aria-label="Popular searches">
                {searchPills.map((item) => (
                  <Link key={item} to={`/search?q=${encodeURIComponent(item)}`} className="focus-ring rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-emerald-950 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-red-700">
                    {item}
                  </Link>
                ))}
              </div>
            </Motion.div>

            <Motion.aside className="relative min-h-[430px]" variants={revealItem} aria-label="Example 3D print listings">
              <Motion.div
                className="absolute inset-x-6 top-8 h-72 rounded-full bg-lime-300/30 blur-3xl"
                animate={shouldReduceMotion ? undefined : { scale: [1, 1.08, 1], y: [0, 18, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 rounded-[4rem] border border-white/80 bg-white/45 shadow-[0_30px_100px_rgba(6,78,59,0.14)] backdrop-blur-xl" />
              <div className="relative mx-auto flex h-full max-w-md flex-col justify-center p-6 sm:p-8">
                <Motion.div
                  className="rounded-[3rem] bg-emerald-950 p-6 text-white shadow-[0_24px_70px_rgba(6,78,59,0.30)]"
                  animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <p className="text-sm font-bold text-red-200">Simple listing</p>
                  <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">Wall hook</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/75">Choose shipped print or downloadable file. Check material, size, and delivery before checkout.</p>
                  <div className="mt-6 flex gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-950">PLA print</span>
                    <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white">STL file</span>
                  </div>
                </Motion.div>

                {floatingItems.map((item, index) => (
                  <Motion.div
                    key={item.label}
                    className={`absolute hidden rounded-[1.75rem] border border-white/80 bg-white/86 px-5 py-4 shadow-[0_18px_45px_rgba(17,24,39,0.12)] backdrop-blur sm:block ${item.className}`}
                    animate={shouldReduceMotion ? undefined : { y: [0, index % 2 ? 10 : -10, 0] }}
                    transition={{ duration: 4.8 + index * 0.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <p className="font-display text-lg font-bold text-emerald-950">{item.label}</p>
                    <p className="text-xs font-bold text-stone-500">{item.detail}</p>
                  </Motion.div>
                ))}
              </div>
            </Motion.aside>
          </Motion.div>
        </section>

        <Motion.section className="px-4 py-10 sm:px-6 lg:px-[5vw]" aria-labelledby="how-it-works-heading" {...scrollReveal}>
          <div className="mx-auto max-w-7xl">
            <Motion.div className="max-w-3xl" variants={revealItem}>
              <p className="text-sm font-bold text-red-700">Start here</p>
              <h2 id="how-it-works-heading" className="mt-3 text-balance font-display text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                Choose what works for you.
              </h2>
            </Motion.div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {waysToShop.map((item) => (
                <Motion.article
                  key={item.title}
                  variants={revealItem}
                  whileHover={shouldReduceMotion ? undefined : { y: -8 }}
                  className="rounded-[3rem] border border-white/80 bg-white/68 p-6 shadow-[0_18px_55px_rgba(6,78,59,0.08)] backdrop-blur"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">{item.step}</span>
                  <h3 className="mt-8 font-display text-3xl font-bold tracking-tight text-emerald-950">{item.title}</h3>
                  <p className="mt-3 text-base font-semibold leading-7 text-stone-600">{item.copy}</p>
                </Motion.article>
              ))}
            </div>
          </div>
        </Motion.section>

        <Motion.section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-label="Latest 3D prints and files" {...scrollReveal}>
          <Motion.div className="mx-auto max-w-7xl rounded-[3.5rem] border border-white/80 bg-white/44 p-2 shadow-[0_24px_80px_rgba(6,78,59,0.10)] backdrop-blur" variants={revealItem}>
            <Products
              user={user}
              embedded
              title="New prints and files"
              eyebrow="Fresh listings"
              description="Browse ready-made prints, replacement parts, desk pieces, gifts, STL files, and bundles."
            />
          </Motion.div>
        </Motion.section>

        <Motion.section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-labelledby="seller-heading" {...scrollReveal}>
          <Motion.div className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-[3.5rem] bg-[#fff7ed] p-6 shadow-[0_26px_80px_rgba(107,45,34,0.13)] ring-1 ring-orange-200/70 md:grid-cols-[1fr_0.9fr] md:p-10" variants={revealItem}>
            <div>
              <p className="text-sm font-bold text-red-700">Sell on 3Dprintings</p>
              <h2 id="seller-heading" className="mt-3 max-w-2xl text-balance font-display text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                Turn your prints into listings people can understand.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-stone-700">
                Add photos, price, material, size, quantity, and shipping details. Keep it clear so buyers know what they are ordering.
              </p>
              <Motion.div className="mt-7 inline-flex" whileHover={shouldReduceMotion ? undefined : { y: -3 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}>
                <Link to="/become-seller" className="focus-ring inline-flex rounded-full bg-red-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/10 transition-colors duration-200 hover:bg-red-600">
                  Open a seller account
                </Link>
              </Motion.div>
            </div>
            <div className="grid gap-3 self-center">
              {sellerPoints.map((item) => (
                <Motion.div key={item} variants={revealItem} className="rounded-[2rem] bg-white/76 p-5 text-base font-bold leading-7 text-emerald-950 shadow-sm ring-1 ring-orange-200/60 backdrop-blur">
                  {item}
                </Motion.div>
              ))}
            </div>
          </Motion.div>
        </Motion.section>

        <Motion.section className="px-4 py-14 sm:px-6 lg:px-[5vw]" aria-labelledby="faq-heading" {...scrollReveal}>
          <div className="mx-auto max-w-7xl">
            <Motion.div className="max-w-3xl" variants={revealItem}>
              <p className="text-sm font-bold text-red-700">Questions</p>
              <h2 id="faq-heading" className="mt-3 text-balance font-display text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                Plain answers before you start.
              </h2>
            </Motion.div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {marketplaceFaqs.map((item) => (
                <Motion.article key={item.question} variants={revealItem} className="rounded-[2.75rem] border border-white/80 bg-white/70 p-6 shadow-[0_14px_45px_rgba(6,78,59,0.08)] backdrop-blur">
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
