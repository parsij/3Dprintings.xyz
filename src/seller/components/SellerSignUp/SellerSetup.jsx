import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import SellerNavBar from "../SellerNavBar.jsx";
import { suggestAccountAddress } from "../../../services/accountSettingsService.js";
import {
  getSellerOnboardingStatus,
  saveSellerShippingOrigin,
} from "../../services/sellerOnboardingService.js";
import PayoutDetails from "./PayoutDetails.jsx";
import { resolveSellerSetupRoute } from "./sellerSetupRouting.js";

const MotionDiv = motion.div;
const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 100;
const US_STATE_CODE_REGEX = /^[A-Z]{2}$/;
const US_ZIP_CODE_REGEX = /^\d{5}(?:-\d{4})?$/;

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  residential: true,
};

function normalizeShippingAddress(address) {
  return {
    line1: String(address.line1 || "").replace(/\s+/g, " ").trim(),
    line2: String(address.line2 || "").replace(/\s+/g, " ").trim(),
    city: String(address.city || "").replace(/\s+/g, " ").trim(),
    state: String(address.state || "").trim().toUpperCase(),
    zip: String(address.zip || "").trim(),
    country: "US",
    residential: true,
  };
}

function validateShippingAddress(address) {
  if (!address.line1 || !address.city || !address.state || !address.zip) {
    return "Enter a complete US shipping origin address.";
  }
  if (!/\d/.test(address.line1)) {
    return "Street address must include a building number.";
  }
  if (!US_STATE_CODE_REGEX.test(address.state)) {
    return "State must be a 2-letter US code, like CA.";
  }
  if (!US_ZIP_CODE_REGEX.test(address.zip)) {
    return "ZIP code must be 5 digits, or ZIP+4 like 94107-1234.";
  }
  return "";
}

export default function SellerSetup({ step }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(EMPTY_ADDRESS);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isAddressSearchFocused, setIsAddressSearchFocused] = useState(false);
  const [isSuggestingAddress, setIsSuggestingAddress] = useState(false);

  const activeStep = useMemo(() => {
    if (step) return step;
    return status?.completionStep || "stripe_connect";
  }, [step, status?.completionStep]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setLoading(true);
      setError("");
      try {
        const data = await getSellerOnboardingStatus();
        if (cancelled) return;
        setStatus(data);

        if (data.isComplete) {
          navigate(data.boxCount > 0 ? "/inventory" : "/boxes?new=1", { replace: true });
          return;
        }

        if (step === "stripe_connect" && data.completionStep && data.completionStep !== "stripe_connect") {
          navigate(resolveSellerSetupRoute(data.completionStep), { replace: true });
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
  }, [navigate, step]);

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

  const handleShippingSubmit = async (event) => {
    event.preventDefault();
    const normalizedAddress = normalizeShippingAddress(shippingAddress);
    const validationError = validateShippingAddress(normalizedAddress);
    setShippingAddress(normalizedAddress);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await saveSellerShippingOrigin({ sellerAddress: normalizedAddress });
      setStatus((prev) => ({ ...prev, ...result }));
      navigate(result?.isComplete ? "/boxes?new=1" : resolveSellerSetupRoute(result?.completionStep), { replace: true });
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

  const mergePayoutStatus = useCallback((nextStatus) => {
    setStatus((prev) => ({ ...prev, ...nextStatus }));
  }, []);

  const handlePayoutRouteComplete = useCallback((result) => {
    setStatus((prev) => ({ ...prev, ...result }));

    if (result?.isComplete) {
      navigate("/inventory", { replace: true });
      return;
    }

    navigate(resolveSellerSetupRoute(result?.completionStep || "shipping_origin"), { replace: true });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-600">Loading seller setup...</p>
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
          </div>
        ) : null}

        {activeStep === "stripe_connect" ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 p-5 shadow-2xl sm:p-8">
            <PayoutDetails
              mode="route"
              onNext={handlePayoutRouteComplete}
              onStatusChange={mergePayoutStatus}
              onRouteComplete={handlePayoutRouteComplete}
            />
          </div>
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
