import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import { IS_LOCAL_DEV, SELLER_SITE_ORIGIN } from "../config/api.js";
import { getUserFacingError } from "../utils/userFacingError.js";
import {
  getSellerMarketplaceStatus,
  saveSellerShopOnboarding,
} from "../seller/services/sellerOnboardingService.js";

const ONBOARDING_STEPS = [
  {
    icon: Store,
    title: "Create your shop",
    description: "Pick a shop name customers will recognize and trust.",
  },
  {
    icon: CreditCard,
    title: "Connect Stripe",
    description: "Secure payouts with Stripe Connect — we never store your bank details.",
  },
  {
    icon: Truck,
    title: "Set shipping origin",
    description: "Tell us where orders ship from so rates stay accurate.",
  },
];

const SELLER_BENEFITS = [
  {
    title: "Built-in checkout",
    description: "Stripe-powered payments with tax and shipping handled for you.",
  },
  {
    title: "Verified shipping",
    description: "Carrier rates calculated on the backend — buyers cannot spoof prices.",
  },
  {
    title: "Seller dashboard",
    description: "Track orders, revenue, reviews, and inventory from one place.",
  },
];

function resolveSellerRedirectUrl(portalUrl) {
  if (portalUrl) return portalUrl;
  return `${SELLER_SITE_ORIGIN}/dashboard`;
}

export default function BecomeSeller({ user, setUser }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shopName, setShopName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sellerStatus, setSellerStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSellerStatus() {
      setLoading(true);
      setError("");
      try {
        const status = await getSellerMarketplaceStatus();
        if (cancelled) return;
        setSellerStatus(status);
        if (status?.shopName) {
          setShopName(status.shopName);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getUserFacingError(err, "Could not load seller status."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSellerStatus();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isSeller = sellerStatus?.isSeller === true;
  const onboardingComplete = sellerStatus?.onboardingComplete === true;
  const sellerPortalUrl = useMemo(
    () => resolveSellerRedirectUrl(sellerStatus?.sellerPortalUrl),
    [sellerStatus?.sellerPortalUrl]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await saveSellerShopOnboarding({
        shopName: shopName.trim(),
        termsOfServiceAccepted: termsAccepted,
      });

      if (response?.user) {
        setUser(response.user);
      }

      const refreshedStatus = await getSellerMarketplaceStatus();
      setSellerStatus(refreshedStatus);

      const redirectUrl = resolveSellerRedirectUrl(
        refreshedStatus?.sellerPortalUrl || `${SELLER_SITE_ORIGIN}/onboarding/stripe`
      );

      if (IS_LOCAL_DEV || window.location.hostname.endsWith("3dprintings.xyz")) {
        window.location.assign(redirectUrl);
        return;
      }

      navigate("/home", { replace: true });
    } catch (err) {
      setError(getUserFacingError(err, "Failed to start seller onboarding."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SmallNavBar />
      <SideMenu />

      <main className="relative min-h-screen overflow-hidden bg-[#fff8f2] pb-16 pt-24 text-gray-900">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-orange-300/30 blur-3xl" />
          <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4">
          <section className="mb-10 text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-orange-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Launch your 3D printing shop
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
              {isSeller ? "Your seller hub awaits" : "Turn prints into profit"}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
              {isSeller
                ? "Manage products, orders, and payouts from your dedicated seller dashboard."
                : "Join the marketplace built for makers. List models, get paid securely, and ship with confidence."}
            </p>
          </section>

          {error ? (
            <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-3xl border border-orange-100 bg-white/90 px-8 py-16 shadow-xl backdrop-blur">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="mt-4 text-sm text-gray-600">Loading seller options...</p>
            </div>
          ) : isSeller ? (
            <section className="mx-auto max-w-3xl">
              <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl">
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 px-8 py-10 text-white sm:px-10">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <LayoutDashboard className="h-8 w-8 text-orange-300" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-orange-200">Seller account</p>
                      <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                        {sellerStatus?.shopName || "Your shop"}
                      </h2>
                      <p className="mt-2 text-sm text-gray-200 sm:text-base">
                        {onboardingComplete
                          ? "Your shop is live. Head to the dashboard to manage listings and orders."
                          : "Finish the remaining setup steps to start selling."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 px-8 py-8 sm:px-10">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Status</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {onboardingComplete ? "Ready to sell" : "Setup in progress"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shop URL</p>
                      <p className="mt-1 truncate text-sm font-medium text-gray-800">
                        {sellerStatus?.shopUrl || "Available after setup"}
                      </p>
                    </div>
                  </div>

                  <a
                    href={sellerPortalUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-orange-400 hover:shadow-xl sm:w-auto"
                  >
                    {onboardingComplete ? "Open Seller Dashboard" : "Continue Seller Setup"}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </section>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="space-y-6">
                <div className="rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900">Why sell here?</h2>
                  <div className="mt-5 space-y-4">
                    {SELLER_BENEFITS.map((benefit) => (
                      <div key={benefit.title} className="flex gap-3 rounded-2xl border border-orange-50 bg-orange-50/40 px-4 py-4">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                        <div>
                          <p className="font-semibold text-gray-900">{benefit.title}</p>
                          <p className="mt-1 text-sm text-gray-600">{benefit.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900">How it works</h2>
                  <ol className="mt-5 space-y-4">
                    {ONBOARDING_STEPS.map((step, index) => {
                      const Icon = step.icon;
                      return (
                        <li key={step.title} className="flex gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-sm font-bold text-white">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-orange-500" />
                              <p className="font-semibold text-gray-900">{step.title}</p>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </section>

              <section className="lg:sticky lg:top-24 lg:self-start">
                <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl">
                  <div className="border-b border-orange-100 bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white sm:px-8">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-6 w-6" />
                      <div>
                        <h2 className="text-xl font-bold">Start selling today</h2>
                        <p className="text-sm text-orange-50">Step 1 of 3 — create your shop</p>
                      </div>
                    </div>
                  </div>

                  <form className="space-y-5 px-6 py-6 sm:px-8 sm:py-8" onSubmit={handleSubmit}>
                    <div>
                      <label htmlFor="shopName" className="mb-2 block text-sm font-semibold text-gray-700">
                        Shop name
                      </label>
                      <input
                        id="shopName"
                        value={shopName}
                        onChange={(event) => setShopName(event.target.value)}
                        maxLength={30}
                        placeholder="My 3D Shop"
                        autoComplete="organization"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        required
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        3–30 characters. Letters, numbers, spaces, and underscores only.
                      </p>
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(event) => setTermsAccepted(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        required
                      />
                      <span>
                        I agree to the Seller Terms of Service and understand that payouts are processed through Stripe Connect.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={submitting || !termsAccepted || shopName.trim().length < 3}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Creating your shop..." : "Continue to Stripe Connect"}
                      {!submitting ? <ArrowRight className="h-5 w-5" /> : null}
                    </button>
                  </form>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
