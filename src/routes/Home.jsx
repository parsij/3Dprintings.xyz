import { Link } from "react-router-dom";
import Navbar from "../components/NavBar.jsx";
import Products from "./Products.jsx";
import Seo from "../components/Seo.jsx";
import { MARKETPLACE_ORIGIN } from "../config/api.js";

const quickLinks = [
  "Replacement parts",
  "Desk toys",
  "Home fixes",
  "STL files",
  "Cosplay bits",
  "3D printed gifts",
];

const shopReasons = [
  {
    title: "Useful little parts",
    copy: "Brackets, clips, knobs, adapters, organizers, and other objects that are hard to find in regular stores.",
  },
  {
    title: "Models from real creators",
    copy: "Buy a finished print, grab a downloadable file, or message the seller when size, material, or fit matters.",
  },
  {
    title: "A shop, not a pitch deck",
    copy: "Photos, prices, reviews, stock, shipping, and seller details stay close to the products so browsing feels simple.",
  },
];

const makerNotes = [
  "Sell printed objects, model files, or both.",
  "Show materials, dimensions, stock, and shipping clearly.",
  "Answer buyer questions before or after an order.",
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

const Home = ({ user }) => {
  return (
    <div className="site-shell min-h-screen overflow-hidden text-emerald-950">
      <Seo
        title="Shop 3D Prints, Parts & Model Files"
        description="Browse physical 3D printed products, replacement parts, 3D printed gifts, and downloadable model files from independent sellers on 3Dprintings.xyz."
        path="/home"
        jsonLd={homeJsonLd}
      />
      <Navbar isSignedIn={Boolean(user)} />

      <main id="main-content">
        <section className="relative px-4 pb-10 pt-28 sm:px-6 lg:px-[5vw] lg:pt-32" aria-labelledby="home-hero-heading">
          <div className="absolute inset-0 maker-grid opacity-60" aria-hidden="true" />
          <div className="absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-emerald-800/28 blur-3xl" aria-hidden="true" />
          <div className="absolute right-[-7rem] top-40 h-80 w-80 rounded-full bg-red-600/22 blur-3xl" aria-hidden="true" />

          <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="max-w-4xl">
              <p className="inline-flex rounded-full border border-red-500/25 bg-emerald-950 px-4 py-2 text-sm font-bold text-white shadow-sm">
                Marketplace for prints and model files
              </p>
              <h1 id="home-hero-heading" className="mt-5 text-balance font-display text-5xl font-bold leading-[0.95] tracking-[-0.045em] text-emerald-950 sm:text-6xl lg:text-7xl xl:text-8xl">
                Find 3D models you can actually use.
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg font-bold leading-8 text-stone-700 sm:text-xl">
                Shop printed parts, fun objects, repair pieces, 3D printed gifts, and downloadable files from independent sellers.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/products" className="focus-ring inline-flex items-center justify-center rounded-full bg-emerald-950 px-7 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(6,78,59,0.22)] transition-colors duration-150 hover:bg-red-600">
                  Browse models
                </Link>
                <Link to="/become-seller" className="focus-ring inline-flex items-center justify-center rounded-full border border-emerald-900/20 bg-white/85 px-7 py-4 text-base font-bold text-emerald-950 shadow-sm backdrop-blur transition-colors duration-150 hover:border-red-500 hover:text-red-700">
                  Sell your prints
                </Link>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-emerald-950/15 bg-emerald-900 p-4 shadow-[0_20px_70px_rgba(6,78,59,0.2)]" aria-label="Popular marketplace searches">
              <div className="rounded-[1.5rem] bg-emerald-950 p-5 text-white">
                <p className="text-sm font-bold text-red-200">Popular right now</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickLinks.map((item) => (
                    <Link key={item} to={`/search?q=${encodeURIComponent(item)}`} className="focus-ring rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-red-500">
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white px-3 py-4">
                  <p className="font-display text-3xl font-bold text-emerald-950">Prints</p>
                  <p className="text-xs font-bold text-emerald-700">shipped</p>
                </div>
                <div className="rounded-2xl bg-red-600 px-3 py-4">
                  <p className="font-display text-3xl font-bold text-white">Files</p>
                  <p className="text-xs font-bold text-red-100">downloaded</p>
                </div>
                <div className="rounded-2xl bg-emerald-700 px-3 py-4">
                  <p className="font-display text-3xl font-bold text-white">Shops</p>
                  <p className="text-xs font-bold text-emerald-100">seller-run</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 lg:px-[5vw]" aria-label="Fresh marketplace listings">
          <div className="mx-auto max-w-7xl">
            <Products
              user={user}
              embedded
              title="Fresh models in the shop"
              eyebrow="Start browsing"
              description="Real listings from sellers: printed parts, useful fixes, desk objects, collectibles, STL files, and bundles."
            />
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-labelledby="why-shop-heading">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-red-700">Why this marketplace exists</p>
              <h2 id="why-shop-heading" className="mt-3 text-balance font-display text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                Small models solve real problems.
              </h2>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {shopReasons.map((item) => (
                <article key={item.title} className="rounded-[2rem] border border-emerald-950/10 bg-white/82 p-6 shadow-[0_14px_45px_rgba(6,78,59,0.08)] backdrop-blur">
                  <h3 className="font-display text-2xl font-bold tracking-tight text-emerald-950">{item.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-7 text-stone-600">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-labelledby="seller-heading">
          <div className="mx-auto grid max-w-7xl gap-6 overflow-hidden rounded-[2.25rem] border border-emerald-900/15 bg-emerald-950 p-6 text-white shadow-[0_28px_80px_rgba(6,78,59,0.22)] md:grid-cols-[1fr_0.8fr] md:p-8 lg:p-10">
            <div>
              <p className="text-sm font-bold text-red-200">For sellers</p>
              <h2 id="seller-heading" className="mt-3 text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Put your models where buyers can find them.
              </h2>
              <p className="mt-5 max-w-2xl text-pretty text-base font-bold leading-8 text-white/75">
                Open a shop for finished prints, downloadable files, or both. Keep the listing clear: photos, price, material, size, stock, and shipping.
              </p>
              <Link to="/become-seller" className="focus-ring mt-7 inline-flex rounded-full bg-red-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition-colors duration-150 hover:bg-red-400">
                Open your shop
              </Link>
            </div>
            <div className="grid gap-3 self-center">
              {makerNotes.map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/8 p-5 text-lg font-bold text-white backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-[5vw]" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-red-700">Quick answers</p>
              <h2 id="faq-heading" className="mt-3 text-balance font-display text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                Before you buy or sell.
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {marketplaceFaqs.map((item) => (
                <article key={item.question} className="rounded-[2rem] border border-emerald-950/10 bg-white/82 p-6 shadow-[0_14px_45px_rgba(6,78,59,0.08)] backdrop-blur">
                  <h3 className="font-display text-2xl font-bold tracking-tight text-emerald-950">{item.question}</h3>
                  <p className="mt-3 text-sm font-bold leading-7 text-stone-600">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
