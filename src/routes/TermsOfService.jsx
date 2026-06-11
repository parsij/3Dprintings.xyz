import { Link } from "react-router-dom";
import Navbar from "../components/NavBar.jsx";
import Seo from "../components/Seo.jsx";

const sections = [
  {
    title: "1. What 3Dprintings.xyz Does",
    body: [
      "3Dprintings.xyz is a marketplace where independent sellers can list physical 3D printed products, downloadable 3D model files, and related 3D printing goods. Buyers can browse listings, message shops, place orders, and review completed purchases.",
      "Sellers are responsible for their listings, photos, descriptions, prices, shipping settings, file rights, and fulfillment. The platform provides marketplace tools, checkout, messaging, and account features.",
    ],
  },
  {
    title: "2. Accounts And Eligibility",
    body: [
      "You must provide accurate account information and keep your login secure. You are responsible for activity that happens through your account.",
      "You may not use the service if you are under 13. If you use the service on behalf of a business, you confirm that you can bind that business to these Terms.",
    ],
  },
  {
    title: "3. Buying Physical Prints And Digital Files",
    body: [
      "Read each listing before purchasing. Listings may include physical printed items, downloadable files, or bundles that include both. Materials, dimensions, colors, tolerances, post-processing, delivery dates, and license terms can vary by seller.",
      "Physical 3D printed products can have layer lines, minor surface variation, and small dimensional differences. Do not use a printed item for safety-critical, medical, food-contact, electrical, load-bearing, automotive, or regulated use unless the listing clearly says it is designed and certified for that use.",
      "Digital files are delivered according to the listing and platform flow. Unless a listing states a broader license, downloaded files are for your personal, non-transferable use and may not be resold, redistributed, uploaded elsewhere, or used to manufacture products for sale.",
    ],
  },
  {
    title: "4. Seller Responsibilities",
    body: [
      "Sellers must own or have the rights needed to list, sell, print, and distribute the products or files they publish. Sellers must not copy another creator's work, use misleading photos, or list items that violate law, intellectual property rights, platform rules, or payment processor rules.",
      "Sellers must describe products accurately, fulfill accepted orders on time, respond to buyer messages when needed, package physical goods reasonably, and keep payout, address, tax, and shop information current.",
      "If a seller lists a downloadable file, the seller is responsible for making sure the file works as described and that the listing clearly explains permitted use.",
    ],
  },
  {
    title: "5. Prohibited Content And Products",
    body: [
      "You may not list, request, upload, buy, or sell illegal items, weapons or weapon components, counterfeit goods, stolen files, hate content, sexually exploitative content, regulated goods, dangerous instructions, malware, or items that infringe another person's rights.",
      "We may remove listings, restrict accounts, cancel orders, or report activity when we believe a listing or account creates legal, safety, payment, or platform risk.",
    ],
  },
  {
    title: "6. Payments, Taxes, Shipping, And Refunds",
    body: [
      "Prices, shipping charges, taxes, and fees are shown during checkout or seller setup when available. Payments and seller payouts may be processed by third-party providers such as Stripe.",
      "Sellers are responsible for setting accurate shipping expectations and fulfilling physical orders. Buyers are responsible for providing a correct delivery address and responding to reasonable seller questions.",
      "Refunds, cancellations, returns, and replacements may depend on the listing, order status, item type, seller policy, and applicable law. Digital files may be non-refundable after access or download unless required by law or the file is materially different from the listing.",
    ],
  },
  {
    title: "7. Reviews, Messages, And Community Conduct",
    body: [
      "Use messages, reviews, and profile content honestly. Do not harass users, manipulate reviews, send spam, request off-platform payment to avoid marketplace protections, or use the service to collect another user's personal information without a valid order-related reason.",
      "We may moderate, remove, or limit content that appears fraudulent, abusive, irrelevant, unsafe, or unlawful.",
    ],
  },
  {
    title: "8. Intellectual Property",
    body: [
      "You keep ownership of content you submit, such as listing photos, descriptions, shop branding, messages, and files. You grant 3Dprintings.xyz a license to host, store, reproduce, display, distribute, and promote that content as needed to operate and market the marketplace.",
      "If you believe content on the service infringes your rights, contact us with enough detail to identify the content, your rights, and how to reach you.",
    ],
  },
  {
    title: "9. Service Changes And Account Enforcement",
    body: [
      "We may change, suspend, or discontinue parts of the service. We may limit or terminate accounts that violate these Terms, create risk, fail required verification, or misuse the marketplace.",
      "You may stop using the service at any time. Some records may be retained as needed for orders, payments, disputes, security, legal compliance, and legitimate business operations.",
    ],
  },
  {
    title: "10. Disclaimers And Liability Limits",
    body: [
      "The service is provided as available. We do not guarantee that every listing will be error-free, available, compatible with your printer, or suitable for a particular use. Independent sellers, not 3Dprintings.xyz, are responsible for the goods and files they list.",
      "To the maximum extent permitted by law, 3Dprintings.xyz is not liable for indirect, incidental, special, consequential, or punitive damages, or for losses caused by seller conduct, buyer misuse, third-party services, shipping carriers, or unauthorized account activity.",
    ],
  },
  {
    title: "11. Updates And Contact",
    body: [
      "We may update these Terms from time to time. The Last Updated date shows when this page was most recently changed. Continued use of the service after changes means you accept the updated Terms.",
      "Questions about these Terms can be sent to support@3dprintings.xyz.",
    ],
  },
];

export default function TermsOfService({ user }) {
  return (
    <div className="site-shell min-h-screen text-gray-900">
      <Seo
        title="Terms Of Service"
        description="Read the 3Dprintings.xyz marketplace terms for buying physical 3D prints, downloading model files, selling products, payments, shipping, and account use."
        path="/terms"
      />
      <Navbar isSignedIn={Boolean(user)} NoNavBarLimit />
      <main id="main-content" className="px-4 pb-20 pt-32 sm:px-6 lg:px-[5vw]">
        <article className="mx-auto max-w-4xl overflow-hidden rounded-[2.4rem] border border-orange-100 bg-white/86 shadow-[0_24px_80px_rgba(17,24,39,0.1)] backdrop-blur">
          <header className="maker-grid border-b border-orange-100 p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">Legal</p>
            <h1 className="mt-3 text-balance font-display text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
              Terms Of Service
            </h1>
            <p className="mt-4 text-sm font-bold text-gray-600">Last Updated: June 11, 2026</p>
            <p className="mt-5 max-w-3xl text-pretty text-base font-semibold leading-8 text-gray-700">
              These Terms explain how buyers, sellers, and visitors may use 3Dprintings.xyz. They are written for a marketplace that supports both physical 3D printed products and downloadable 3D model files.
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
              Also read the <Link to="/privacy" className="font-black text-orange-700 underline decoration-orange-300 underline-offset-4 hover:text-orange-900">Privacy Policy</Link> to understand how marketplace data is collected, used, and shared.
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
