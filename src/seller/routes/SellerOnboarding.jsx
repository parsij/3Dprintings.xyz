import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import SellerNavBar from "../components/SellerNavBar.jsx";
import { suggestAccountAddress } from "../../services/accountSettingsService.js";
import {
  createStripeConnectLink,
  getSellerOnboardingStatus,
  saveSellerShippingOrigin,
  verifyStripeConnectOnboardingWithRetry,
} from "../services/sellerOnboardingService.js";

const MotionDiv = motion.div;
const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 100;

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  residential: true,
};

const ONBOARDING_ROUTE_BY_STEP = {
  stripe_connect: "/onboarding/stripe",
  shipping_origin: "/onboarding/shipping",
  first_box: "/boxes?new=1",
  completed: "/inventory",
};

function resolveOnboardingRoute(completionStep) {
  return ONBOARDING_ROUTE_BY_STEP[completionStep] || "/onboarding/stripe";
}

export default function SellerOnboarding({ step }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stripeReturnHandledRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingStripeReturn, setVerifyingStripeReturn] = useState(false);
  const [showStripeRefreshNotice, setShowStripeRefreshNotice] = useState(false);
  const [error, setError] = useState("");
  const [stripeActionUrl, setStripeActionUrl] = useState("");
  const [stripeRequiresAction, setStripeRequiresAction] = useState(null);
  const [stripeNotice, setStripeNotice] = useState("");
  const [status, setStatus] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(EMPTY_ADDRESS);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isAddressSearchFocused, setIsAddressSearchFocused] = useState(false);
  const [isSuggestingAddress, setIsSuggestingAddress] = useState(false);

  const stripeReturnMode = searchParams.get("return") === "1"
    ? "return"
    : searchParams.get("refresh") === "1"
      ? "refresh"
      : null;

  const activeStep = useMemo(() => {
    if (step) return step;
    return status?.completionStep || "stripe_connect";
  }, [step, status?.completionStep]);

  const clearStripeReturnParams = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("return");
    nextParams.delete("refresh");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setLoading(true);
      setError("");
      try {
        const data = await getSellerOnboardingStatus();
        if (cancelled) return;
        setStatus(data);

        if (data.stripeReadiness?.needsAccountUpdate) {
          setStripeRequiresAction({
            message: data.stripeRequirementSummary
              || "Stripe needs additional information before payouts can be enabled.",
            actionUrl: "",
          });
        } else {
          setStripeRequiresAction(null);
        }

        if (data.isComplete) {
          navigate(data.boxCount > 0 ? "/inventory" : "/boxes?new=1", { replace: true });
          return;
        }

        if (step === "stripe_connect" && data.completionStep && data.completionStep !== "stripe_connect") {
          if (stripeReturnMode === "return") {
            stripeReturnHandledRef.current = true;
            clearStripeReturnParams();
          }
          navigate(resolveOnboardingRoute(data.completionStep), { replace: true });
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Failed to load onboarding status.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [clearStripeReturnParams, navigate, step, stripeReturnMode]);

  useEffect(() => {
    if (stripeReturnMode !== "refresh") return undefined;
    setShowStripeRefreshNotice(true);
    clearStripeReturnParams();
    return undefined;
  }, [clearStripeReturnParams, stripeReturnMode]);

  useEffect(() => {
    if (step !== "stripe_connect") return undefined;
    if (stripeReturnMode !== "return") return undefined;
    if (loading) return undefined;
    if (stripeReturnHandledRef.current) return undefined;

    stripeReturnHandledRef.current = true;
    let cancelled = false;

    async function verifyStripeReturn() {
      setVerifyingStripeReturn(true);
      setSubmitting(true);
      setError("");
      setStripeActionUrl("");
      setStripeRequiresAction(null);
      setStripeNotice("");

      try {
        const result = await verifyStripeConnectOnboardingWithRetry();
        if (cancelled) return;

        clearStripeReturnParams();
        setStatus((prev) => ({ ...prev, ...result }));
        if (result.stripePendingReview) {
          setStripeNotice("Stripe is reviewing your account. You can continue setup now; payouts activate once Stripe finishes review.");
        }

        if (result.isComplete) {
          navigate("/inventory", { replace: true });
          return;
        }

        navigate(resolveOnboardingRoute(result.completionStep || "shipping_origin"), { replace: true });
      } catch (err) {
        if (!cancelled) {
          clearStripeReturnParams();
          const data = err?.response?.data || {};
          if (data.needsAccountUpdate) {
            setStripeRequiresAction({
              message: data.message || data.stripeRequirementSummary || "Stripe needs additional information.",
              actionUrl: data.actionUrl || "",
            });
            setError("");
          } else {
            setError(data.message || "Stripe Connect is not complete yet. Try again in a moment.");
            if (data.actionUrl) {
              setStripeActionUrl(data.actionUrl);
            }
          }
        }
      } finally {
        if (!cancelled) {
          setVerifyingStripeReturn(false);
          setSubmitting(false);
        }
      }
    }

    verifyStripeReturn();
    return () => {
      cancelled = true;
    };
  }, [clearStripeReturnParams, loading, navigate, step, stripeReturnMode]);

  useEffect(() => {
    if (activeStep !== "shipping_origin") return undefined;

    const q = shippingAddress.line1.trim();
    if (q.length < 3) {
      setAddressSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsSuggestingAddress(true);
        const data = await suggestAccountAddress(q, { limit: 6, signal: controller.signal });
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setAddressSuggestions(suggestions);
      } catch {
        if (controller.signal.aborted) return;
        setAddressSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggestingAddress(false);
        }
      }
    }, ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeStep, shippingAddress.line1]);

  const handleStripeRemediation = () => {
    const actionUrl = stripeRequiresAction?.actionUrl || stripeActionUrl;
    if (actionUrl) {
      window.location.assign(actionUrl);
    }
  };

  const handleStripeConnect = async () => {
    if (stripeRequiresAction?.actionUrl) {
      handleStripeRemediation();
      return;
    }

    setSubmitting(true);
    setError("");
    setStripeActionUrl("");
    setStripeNotice("");
    try {
      const result = await createStripeConnectLink();
      if (result?.url) {
        window.location.assign(result.url);
        return;
      }
      setError("Stripe Connect link was not returned.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start Stripe Connect.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShippingSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await saveSellerShippingOrigin({ sellerAddress: shippingAddress });
      setStatus((prev) => ({ ...prev, ...result }));
      navigate(result?.isComplete ? "/boxes?new=1" : resolveOnboardingRoute(result?.completionStep), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save shipping origin.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleAddressSuggestions = useMemo(() => {
    if (!isAddressSearchFocused) return [];

    const query = shippingAddress.line1.trim().toLowerCase();
    if (!query) return addressSuggestions;

    return addressSuggestions.filter((suggestion) => {
      const streetLine = (
        suggestion.streetLine
        || `${suggestion.houseNumber ? `${suggestion.houseNumber} ` : ""}${suggestion.street || ""}`
      ).trim().toLowerCase();
      const display = String(suggestion.displayAddress || "").trim().toLowerCase();
      return streetLine !== query && display !== query;
    });
  }, [addressSuggestions, isAddressSearchFocused, shippingAddress.line1]);

  const showShippingSuggestionDropdown = isAddressSearchFocused
    && (isSuggestingAddress || visibleAddressSuggestions.length > 0);

  const applyAddressSuggestion = (suggestion) => {
    const streetLine = (
      suggestion.streetLine
      || `${suggestion.houseNumber ? `${suggestion.houseNumber} ` : ""}${suggestion.street || ""}`
    ).trim();
    setShippingAddress((prev) => ({
      ...prev,
      line1: streetLine,
      city: suggestion.city || "",
      state: (suggestion.state || "").toUpperCase(),
      zip: suggestion.postcode || "",
      country: "US",
    }));
    setIsAddressSearchFocused(false);
  };

  if (loading || verifyingStripeReturn) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-600">
            {verifyingStripeReturn ? "Confirming your Stripe Connect setup..." : "Loading seller setup..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <SellerNavBar pageName="Seller Setup" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>
            {stripeActionUrl ? (
              <button
                type="button"
                onClick={handleStripeRemediation}
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
              >
                Continue in Stripe
              </button>
            ) : null}
          </div>
        ) : null}

        {stripeRequiresAction ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">One more step in Stripe</p>
            <p className="mt-1">{stripeRequiresAction.message}</p>
            <button
              type="button"
              onClick={stripeRequiresAction.actionUrl ? handleStripeRemediation : handleStripeConnect}
              disabled={!stripeRequiresAction.actionUrl && submitting}
              className="mt-3 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
            >
              {stripeRequiresAction.actionUrl
                ? "Upload documents in Stripe"
                : submitting
                  ? "Opening Stripe..."
                  : "Continue in Stripe"}
            </button>
          </div>
        ) : null}

        {stripeNotice ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {stripeNotice}
          </div>
        ) : null}

        {activeStep === "stripe_connect" ? (
          <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-md">
            <h1 className="text-2xl font-bold text-gray-900">Connect payouts with Stripe</h1>
            <p className="mt-2 text-sm text-gray-600">
              We preset your shop URL for Stripe:{" "}
              <span className="font-medium text-gray-800">{status?.shopUrl}</span>
            </p>
            {showStripeRefreshNotice ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your Stripe session expired. Continue below to open a fresh Stripe Connect link.
              </p>
            ) : null}
            {!stripeRequiresAction ? (
              <button
                type="button"
                onClick={handleStripeConnect}
                disabled={submitting}
                className="mt-6 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-400 disabled:opacity-60"
              >
                {submitting ? "Opening Stripe..." : "Continue with Stripe Connect"}
              </button>
            ) : null}
          </section>
        ) : null}

        {activeStep === "shipping_origin" ? (
          <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-md">
            <h1 className="text-2xl font-bold text-gray-900">Where will you ship from?</h1>
            <p className="mt-2 text-sm text-gray-600">This address is used for shipping rate calculations.</p>
            <form className="mt-5 space-y-3" onSubmit={handleShippingSubmit}>
              <div>
                <label htmlFor="shipping-line1" className="mb-1 block text-sm font-semibold text-gray-700">
                  Street address
                </label>
                <div className="relative">
                  <input
                    id="shipping-line1"
                    name="line1"
                    value={shippingAddress.line1}
                    onChange={(event) => {
                      setShippingAddress((prev) => ({ ...prev, line1: event.target.value }));
                    }}
                    onFocus={() => {
                      setIsAddressSearchFocused(true);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setIsAddressSearchFocused(false);
                      }, 150);
                    }}
                    placeholder="Start typing your street address..."
                    autoComplete="off"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition-all duration-300 hover:border-orange-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                    required
                  />
                  {isSuggestingAddress && isAddressSearchFocused ? (
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    </div>
                  ) : null}

                  {showShippingSuggestionDropdown ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-orange-100 bg-white shadow-xl">
                      <ul className="hide-scrollbar max-h-60 overflow-auto py-1">
                        {isSuggestingAddress && visibleAddressSuggestions.length === 0 ? (
                          <li className="px-4 py-3 text-sm text-gray-500">Searching addresses...</li>
                        ) : (
                          visibleAddressSuggestions.map((suggestion, idx) => {
                            const streetLine = (
                              suggestion.streetLine
                              || `${suggestion.houseNumber ? `${suggestion.houseNumber} ` : ""}${suggestion.street || ""}`
                            ).trim();

                            return (
                              <li key={`${suggestion.displayAddress}-${idx}`}>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => applyAddressSuggestion(suggestion)}
                                  className="w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-orange-50"
                                >
                                  <div className="text-sm font-medium text-gray-800">{streetLine}</div>
                                  <div className="text-xs text-gray-600">
                                    {suggestion.city}, {suggestion.state} {suggestion.postcode}
                                  </div>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor="shipping-line2" className="mb-1 block text-sm font-semibold text-gray-700">
                  Apt / suite number
                </label>
                <input
                  id="shipping-line2"
                  name="line2"
                  value={shippingAddress.line2}
                  onChange={(event) => setShippingAddress((prev) => ({ ...prev, line2: event.target.value }))}
                  placeholder="Apt, suite, unit, building, floor, etc."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition-all duration-300 hover:border-orange-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                />
              </div>

              {[
                ["city", "City", "San Francisco"],
                ["state", "State", "CA"],
                ["zip", "ZIP code", "94107"],
              ].map(([field, label, placeholder]) => (
                <label key={field} htmlFor={`shipping-${field}`} className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
                <input
                  id={`shipping-${field}`}
                  name={field}
                  value={shippingAddress[field]}
                  onChange={(event) => {
                    const value = field === "state"
                      ? event.target.value.toUpperCase()
                      : event.target.value;
                    setShippingAddress((prev) => ({ ...prev, [field]: value }));
                  }}
                  placeholder={placeholder}
                  className={`w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition-all duration-300 hover:border-orange-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20${field === "state" ? " uppercase" : ""}`}
                  required
                  {...(field === "state" ? { maxLength: 2 } : {})}
                />
                </label>
              ))}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-400 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save shipping origin"}
              </button>
            </form>
          </section>
        ) : null}

        {activeStep === "complete" ? (
          <section className="rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-md">
            <AnimatePresence>
              <MotionDiv
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 14 }}
              >
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
                <h1 className="text-3xl font-extrabold text-gray-900">You are all set!</h1>
                <p className="mt-3 text-gray-600">You can now post your first product.</p>
                <button
                  type="button"
                  onClick={() => navigate("/inventory", { replace: true })}
                  className="mt-6 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-400"
                >
                  Go to inventory
                </button>
              </MotionDiv>
            </AnimatePresence>
          </section>
        ) : null}
      </main>
    </div>
  );
}
