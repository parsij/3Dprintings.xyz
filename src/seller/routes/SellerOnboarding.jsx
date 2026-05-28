import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import SellerNavBar from "../components/SellerNavBar.jsx";
import {
  createStripeConnectLink,
  getSellerOnboardingStatus,
  saveSellerFirstBox,
  saveSellerShippingOrigin,
  verifyStripeConnectOnboardingWithRetry,
} from "../services/sellerOnboardingService.js";

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
  first_box: "/onboarding/box",
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
  const [status, setStatus] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(EMPTY_ADDRESS);
  const [boxForm, setBoxForm] = useState({
    name: "Primary Box",
    width: "",
    length: "",
    height: "",
    maxWeight: "",
  });

  const stripeReturnMode = searchParams.get("return") === "1"
    ? "return"
    : searchParams.get("refresh") === "1"
      ? "refresh"
      : null;

  const activeStep = useMemo(() => {
    if (step) return step;
    return status?.completionStep || "stripe_connect";
  }, [step, status?.completionStep]);

  const clearStripeReturnParams = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("return");
    nextParams.delete("refresh");
    setSearchParams(nextParams, { replace: true });
  };

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
          navigate("/inventory", { replace: true });
          return;
        }

        if (
          step === "stripe_connect"
          && stripeReturnMode !== "return"
          && data.completionStep
          && data.completionStep !== "stripe_connect"
        ) {
          navigate(resolveOnboardingRoute(data.completionStep), { replace: true });
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
  }, [navigate, step, stripeReturnMode]);

  useEffect(() => {
    if (stripeReturnMode !== "refresh") return undefined;
    setShowStripeRefreshNotice(true);
    clearStripeReturnParams();
    return undefined;
  }, [stripeReturnMode]);

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

      try {
        const result = await verifyStripeConnectOnboardingWithRetry();
        if (cancelled) return;

        clearStripeReturnParams();
        setStatus((prev) => ({ ...prev, ...result }));

        if (result.isComplete) {
          navigate("/inventory", { replace: true });
          return;
        }

        navigate(resolveOnboardingRoute(result.completionStep || "shipping_origin"), { replace: true });
      } catch (err) {
        if (!cancelled) {
          clearStripeReturnParams();
          setError(err?.response?.data?.message || "Stripe Connect is not complete yet. Try again in a moment.");
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
  }, [loading, navigate, searchParams, setSearchParams, step, stripeReturnMode]);

  const handleStripeConnect = async () => {
    setSubmitting(true);
    setError("");
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
      navigate("/onboarding/box", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save shipping origin.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstBoxSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await saveSellerFirstBox(boxForm);
      navigate("/onboarding/complete", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save your first box.");
    } finally {
      setSubmitting(false);
    }
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
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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
            <button
              type="button"
              onClick={handleStripeConnect}
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-400 disabled:opacity-60"
            >
              {submitting ? "Opening Stripe..." : "Continue with Stripe Connect"}
            </button>
          </section>
        ) : null}

        {activeStep === "shipping_origin" ? (
          <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-md">
            <h1 className="text-2xl font-bold text-gray-900">Where will you ship from?</h1>
            <p className="mt-2 text-sm text-gray-600">This address is used for shipping rate calculations.</p>
            <form className="mt-5 space-y-3" onSubmit={handleShippingSubmit}>
              {["line1", "line2", "city", "state", "zip"].map((field) => (
                <input
                  key={field}
                  name={field}
                  value={shippingAddress[field]}
                  onChange={(event) => setShippingAddress((prev) => ({ ...prev, [field]: event.target.value }))}
                  placeholder={field}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  required={field !== "line2"}
                />
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

        {activeStep === "first_box" ? (
          <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-md">
            <h1 className="text-2xl font-bold text-gray-900">Add your first shipping box</h1>
            <p className="mt-2 text-sm text-gray-600">Sellers must keep at least one box that fits products at 95% capacity.</p>
            <form className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleFirstBoxSubmit}>
              <input
                name="name"
                value={boxForm.name}
                onChange={(event) => setBoxForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Box name"
                className="sm:col-span-2 rounded-xl border border-gray-300 px-4 py-3"
                required
              />
              {["width", "length", "height", "maxWeight"].map((field) => (
                <input
                  key={field}
                  name={field}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={boxForm[field]}
                  onChange={(event) => setBoxForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  placeholder={field}
                  className="rounded-xl border border-gray-300 px-4 py-3"
                  required
                />
              ))}
              <button
                type="submit"
                disabled={submitting}
                className="sm:col-span-2 rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-400 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save first box"}
              </button>
            </form>
          </section>
        ) : null}

        {activeStep === "complete" ? (
          <section className="rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-md">
            <AnimatePresence>
              <motion.div
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
              </motion.div>
            </AnimatePresence>
          </section>
        ) : null}
      </main>
    </div>
  );
}
