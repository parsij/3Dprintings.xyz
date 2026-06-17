import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

import {
    createStripeConnectLink,
    getSellerMarketplaceStatus,
    getSellerOnboardingStatus,
    verifyStripeConnectOnboardingWithRetry,
} from "../../services/sellerOnboardingService.js";
import { SELLER_SITE_ORIGIN } from "../../../config/api.js";
import { redirectToAllowedUrl } from "../../../utils/safeRedirect.js";
import { getUserFacingError } from "../../../utils/userFacingError.js";

function getStripeActionRequirement(data) {
    if (!data?.stripeReadiness?.needsAccountUpdate && !data?.needsAccountUpdate) {
        return null;
    }

    return {
        message: data.message
            || data.stripeRequirementSummary
            || "Stripe needs additional information before payouts can be enabled.",
        actionUrl: data.actionUrl || "",
    };
}

const PayoutDetails = ({ onNext, onPrev, mode = "embedded", onStatusChange, onRouteComplete }) => {
    const isRouteMode = mode === "route";
    const [searchParams, setSearchParams] = useSearchParams();
    const stripeReturnHandledRef = useRef(false);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [verifyingReturn, setVerifyingReturn] = useState(false);
    const [error, setError] = useState("");
    const [redirecting, setRedirecting] = useState(false);
    const [stripeNotice, setStripeNotice] = useState("");
    const [stripeRequiresAction, setStripeRequiresAction] = useState(null);
    const [stripeActionUrl, setStripeActionUrl] = useState("");

    const stripeReturnMode = searchParams.get("return") === "1"
        ? "return"
        : searchParams.get("refresh") === "1"
            ? "refresh"
            : null;

    const clearStripeReturnParams = useCallback(() => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("return");
        nextParams.delete("refresh");
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        let cancelled = false;

        const checkStripeStatus = async () => {
            setLoading(true);
            setError("");
            try {
                const currentStatus = isRouteMode
                    ? await getSellerOnboardingStatus()
                    : await getSellerMarketplaceStatus();
                if (cancelled) return;

                setStatus(currentStatus);
                onStatusChange?.(currentStatus);
                setStripeRequiresAction(getStripeActionRequirement(currentStatus));
            } catch (err) {
                if (!cancelled) setError(getUserFacingError(err, "Could not verify Stripe connection status."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        checkStripeStatus();
        return () => { cancelled = true; };
    }, [isRouteMode, onStatusChange]);

    useEffect(() => {
        if (!isRouteMode || stripeReturnMode !== "refresh") return undefined;
        setStripeNotice("Your Stripe session expired. Continue below to open a fresh Stripe Connect link.");
        clearStripeReturnParams();
        return undefined;
    }, [clearStripeReturnParams, isRouteMode, stripeReturnMode]);

    useEffect(() => {
        if (!isRouteMode) return undefined;
        if (stripeReturnMode !== "return") return undefined;
        if (loading) return undefined;
        if (stripeReturnHandledRef.current) return undefined;

        stripeReturnHandledRef.current = true;
        let cancelled = false;

        const verifyStripeReturn = async () => {
            setVerifyingReturn(true);
            setRedirecting(false);
            setError("");
            setStripeNotice("");
            setStripeActionUrl("");
            setStripeRequiresAction(null);

            try {
                const result = await verifyStripeConnectOnboardingWithRetry();
                if (cancelled) return;

                clearStripeReturnParams();
                setStatus((previousStatus) => ({ ...previousStatus, ...result }));
                onStatusChange?.(result);

                if (result.stripePendingReview) {
                    setStripeNotice("Stripe is reviewing your account. You can continue setup now; payouts activate once Stripe finishes review.");
                }

                onRouteComplete?.(result);
            } catch (err) {
                if (cancelled) return;

                clearStripeReturnParams();
                const data = err?.response?.data || {};
                const requirement = getStripeActionRequirement(data);
                if (requirement) {
                    setStripeRequiresAction(requirement);
                    setError("");
                } else {
                    setError(data.message || "Stripe Connect is not complete yet. Try again in a moment.");
                    setStripeActionUrl(data.actionUrl || "");
                }
            } finally {
                if (!cancelled) {
                    setVerifyingReturn(false);
                }
            }
        };

        verifyStripeReturn();
        return () => { cancelled = true; };
    }, [clearStripeReturnParams, isRouteMode, loading, onRouteComplete, onStatusChange, stripeReturnMode]);

    const handleStripeRemediation = () => {
        const actionUrl = stripeRequiresAction?.actionUrl || stripeActionUrl;
        if (actionUrl) {
            try {
                redirectToAllowedUrl(actionUrl, { allowedHostnames: ["connect.stripe.com"] });
            } catch {
                setError("Stripe returned an invalid redirect URL.");
            }
        }
    };

    const handleStripeConnect = async () => {
        if (stripeRequiresAction?.actionUrl || stripeActionUrl) {
            handleStripeRemediation();
            return;
        }

        setRedirecting(true);
        setError("");
        setStripeNotice("");
        try {
            if (isRouteMode) {
                const result = await createStripeConnectLink();
                if (result?.url) {
                    redirectToAllowedUrl(result.url, { allowedHostnames: ["connect.stripe.com"] });
                    return;
                }
                setError("Stripe Connect link was not returned.");
                return;
            }

            const portalUrl = status?.sellerPortalUrl;
            const redirectUrl = portalUrl || `${SELLER_SITE_ORIGIN}/onboarding/stripe`;
            redirectToAllowedUrl(redirectUrl, { allowedOrigins: [SELLER_SITE_ORIGIN] });
        } catch (err) {
            setError(getUserFacingError(err, "Failed to start Stripe Connect."));
        } finally {
            setRedirecting(false);
        }
    };

    const isStripeConnected = isRouteMode
        ? Boolean(status?.stripeReady || status?.isComplete || (status?.completionStep && status.completionStep !== "stripe_connect"))
        : status?.onboardingComplete === true;
    const isBusy = loading || verifyingReturn;
    const canContinue = isStripeConnected && !isBusy && !redirecting;

    return (
        <Motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full text-left"
            aria-labelledby="payout-heading"
        >
            <h3 id="payout-heading" className="text-xl font-bold text-white mb-4">Connect Payouts</h3>
            <p className="text-zinc-400 mb-6 text-sm">
                Connect Stripe so marketplace orders can route payouts to your bank account.
                Sensitive financial details are handled by Stripe and are not stored directly on our servers.
            </p>

            {status?.shopUrl && (
                <p className="mb-6 rounded-xl border border-zinc-800 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-300">
                    Stripe will use your shop URL: <span className="font-semibold text-white">{status.shopUrl}</span>
                </p>
            )}

            {error && (
                <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-sm">{error}</p>
                        {stripeActionUrl && (
                            <button
                                type="button"
                                onClick={handleStripeRemediation}
                                className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/10"
                            >
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                Continue in Stripe
                            </button>
                        )}
                    </div>
                </div>
            )}

            {stripeRequiresAction && (
                <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
                    <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-sm font-bold">One more step in Stripe</p>
                        <p className="mt-1 text-sm text-amber-100/80">{stripeRequiresAction.message}</p>
                        <button
                            type="button"
                            onClick={handleStripeConnect}
                            disabled={redirecting}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 px-4 py-2 text-sm font-bold text-amber-50 transition hover:bg-amber-500/10 disabled:cursor-wait disabled:opacity-70"
                        >
                            {redirecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
                            Continue in Stripe
                        </button>
                    </div>
                </div>
            )}

            {stripeNotice && (
                <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
                    {stripeNotice}
                </div>
            )}

            <div className="flex justify-center min-h-[100px] items-center mb-8" aria-live="polite">
                <AnimatePresence mode="wait">
                    {isBusy ? (
                        <Motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-zinc-500 gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" aria-hidden="true" />
                            <span className="text-sm font-medium">{verifyingReturn ? "Confirming Stripe setup…" : "Checking connection status…"}</span>
                        </Motion.div>
                    ) : isStripeConnected ? (
                        <Motion.div key="connected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" aria-hidden="true" />
                            <div className="text-center">
                                <h4 className="text-emerald-400 font-bold text-lg">Stripe Connected</h4>
                                <p className="text-emerald-500/70 text-xs mt-1">Your account is ready to receive payouts.</p>
                            </div>
                        </Motion.div>
                    ) : !stripeRequiresAction ? (
                        <Motion.div key="connect" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <button
                                type="button"
                                onClick={handleStripeConnect}
                                disabled={redirecting}
                                className="group flex items-center gap-2 px-8 py-3.5 bg-linear-to-b from-orange-400 to-orange-600 text-white font-bold text-lg rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 active:translate-y-0 border border-orange-400/50 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                            >
                                {redirecting ? (
                                    <><Loader2 className="h-5 w-5 animate-spin" /> Redirecting…</>
                                ) : (
                                    <><ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /> Connect via Stripe</>
                                )}
                            </button>
                        </Motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3">
                {onPrev ? (
                    <button type="button" onClick={onPrev} disabled={redirecting} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl sm:rounded-full font-semibold text-zinc-400 hover:text-white transition-colors border border-zinc-800 sm:border-transparent disabled:opacity-50">
                        Back
                    </button>
                ) : <span aria-hidden="true" />}
                <button type="button" onClick={() => onNext?.(status)} disabled={!canContinue} className={`w-full sm:w-auto px-8 py-3 sm:py-2.5 rounded-xl sm:rounded-full font-bold shadow-lg transition-all transform ${canContinue ? 'bg-blue-500 text-white hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                    Continue
                </button>
            </div>
        </Motion.section>
    );
};

export default PayoutDetails;
