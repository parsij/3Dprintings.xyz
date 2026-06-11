import { Link } from "react-router-dom";
import Navbar from "../components/NavBar.jsx";
import Seo from "../components/Seo.jsx";

const sections = [
  {
    title: "1. Information We Collect",
    body: [
      "Account information, such as username, email address, password authentication data, login status, and account role.",
      "Marketplace information, such as cart activity, saved and liked products, orders, reviews, messages, support requests, listing photos, product descriptions, downloadable file details, shop names, seller preferences, and seller onboarding status.",
      "Transaction and fulfillment information, such as item details, order totals, payment status, shipping address, tracking details, refund status, and records needed to resolve disputes. Payment card and bank details may be handled by third-party payment processors such as Stripe rather than stored directly by 3Dprintings.xyz.",
      "Technical information, such as IP address, device and browser data, cookies, session identifiers, CSRF tokens, local storage preferences, log data, and security signals.",
    ],
  },
  {
    title: "2. How We Use Information",
    body: [
      "To operate the marketplace, authenticate accounts, process orders, support seller onboarding, enable messages, show reviews, remember preferences, and provide customer support.",
      "To process payments, seller payouts, fraud checks, shipping, refunds, disputes, tax or compliance needs, and platform safety reviews.",
      "To improve search, product discovery, user experience, performance, security, and marketplace quality.",
      "To send service messages, order updates, account notices, policy updates, and support replies. Marketing messages, if used, should include a way to opt out where required.",
    ],
  },
  {
    title: "3. How Information Is Shared",
    body: [
      "With sellers and buyers as needed to complete marketplace transactions, such as sharing order details, product context, messages, shipping information, and review information.",
      "With service providers that help run the platform, such as payment processors, shipping tools, hosting providers, email services, database providers, security tools, analytics, and support tools.",
      "With authorities, payment processors, or other parties when needed to comply with law, prevent fraud, enforce terms, protect rights and safety, or respond to legal process.",
      "As part of a business transfer, merger, financing, acquisition, reorganization, or sale of assets, subject to appropriate protections for personal information.",
    ],
  },
  {
    title: "4. Cookies And Local Storage",
    body: [
      "The site may use cookies, local storage, and similar technologies for sign-in sessions, CSRF protection, security, cart behavior, theme preference, seller routing, and site performance.",
      "Browser settings may let you block or delete cookies. Some marketplace features may not work correctly if required cookies or local storage are disabled.",
    ],
  },
  {
    title: "5. Your Choices And Rights",
    body: [
      "You can update account information through account settings where available. You can contact support@3dprintings.xyz to request access, correction, deletion, or help with account information.",
      "Some information may need to be retained for orders, payments, fraud prevention, legal compliance, tax records, dispute resolution, backups, and platform security.",
      "Depending on where you live, you may have privacy rights such as the right to know, access, correct, delete, restrict, opt out of certain sharing, or appeal a privacy decision. California residents may have rights under the CCPA/CPRA if the law applies to the business.",
    ],
  },
  {
    title: "6. Security And Retention",
    body: [
      "We use reasonable administrative, technical, and organizational measures designed to protect personal information. No internet service can guarantee perfect security.",
      "Information is kept for as long as needed for the purposes described in this Policy, including marketplace operations, account management, order records, legal compliance, fraud prevention, backups, and legitimate business needs.",
    ],
  },
  {
    title: "7. Children",
    body: [
      "The service is not directed to children under 13, and children under 13 may not create accounts or submit personal information. If you believe a child provided personal information, contact support@3dprintings.xyz.",
    ],
  },
  {
    title: "8. International Users",
    body: [
      "If you use the service from outside the United States, your information may be processed in the United States or other places where the platform or its providers operate. Those locations may have different privacy laws than your location.",
    ],
  },
  {
    title: "9. Changes And Contact",
    body: [
      "We may update this Privacy Policy from time to time. The Last Updated date shows when this page was most recently changed.",
      "Privacy questions or requests can be sent to support@3dprintings.xyz.",
    ],
  },
];

export default function PrivacyPolicy({ user }) {
  return (
    <div className="site-shell min-h-screen text-gray-900">
      <Seo
        title="Privacy Policy"
        description="Learn how 3Dprintings.xyz collects, uses, shares, and protects marketplace information for buyers, sellers, orders, messages, payments, and listings."
        path="/privacy"
      />
      <Navbar isSignedIn={Boolean(user)} NoNavBarLimit />
      <main id="main-content" className="px-4 pb-20 pt-32 sm:px-6 lg:px-[5vw]">
        <article className="mx-auto max-w-4xl overflow-hidden rounded-[2.4rem] border border-orange-100 bg-white/86 shadow-[0_24px_80px_rgba(17,24,39,0.1)] backdrop-blur">
          <header className="maker-grid border-b border-orange-100 p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">Legal</p>
            <h1 className="mt-3 text-balance font-display text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm font-bold text-gray-600">Last Updated: June 11, 2026</p>
            <p className="mt-5 max-w-3xl text-pretty text-base font-semibold leading-8 text-gray-700">
              This Policy explains how 3Dprintings.xyz handles information for a marketplace that supports buyers, sellers, physical 3D printed products, downloadable files, messages, payments, shipping, and reviews.
            </p>
          </header>

          <div className="space-y-8 p-6 sm:p-8 lg:p-10">
            {sections.map((section) => (
              <section key={section.title} aria-labelledby={section.title.replaceAll(" ", "-").toLowerCase()}>
                <h2 id={section.title.replaceAll(" ", "-").toLowerCase()} className="scroll-mt-28 font-display text-2xl font-black tracking-tight text-gray-950">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-pretty text-sm font-semibold leading-7 text-gray-600 sm:text-base">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5 text-sm font-semibold leading-7 text-orange-950">
              Also read the <Link to="/terms" className="font-black text-orange-700 underline decoration-orange-300 underline-offset-4 hover:text-orange-900">Terms Of Service</Link> for marketplace rules that apply to buyers, sellers, products, files, and orders.
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
