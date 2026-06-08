import { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

import { getSellerMarketplaceStatus } from "../../services/sellerOnboardingService.js";
import { SELLER_SITE_ORIGIN } from "../../../config/api.js";
import { getUserFacingError } from "../../../utils/userFacingError.js";

const PayoutDetails = ({ onNext, onPrev }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const checkStripeStatus = async () => {
            setLoading(true);
            setError("");
            try {
                const currentStatus = await getSellerMarketplaceStatus();
                if (!cancelled) setStatus(currentStatus);
            } catch (err) {
                if (!cancelled) setError(getUserFacingError(err, "Could not verify Stripe connection status."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        checkStripeStatus();
        return () => { cancelled = true; };
    }, []);

    const handleStripeConnect = () => {
        setRedirecting(true);
        const portalUrl = status?.sellerPortalUrl;
        const redirectUrl = portalUrl || `${SELLER_SITE_ORIGIN}/onboarding/stripe`;
        window.location.assign(redirectUrl);
    };

    const isStripeConnected = status?.onboardingComplete === true;

    return (
        <Motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full text-left"
            aria-labelledby="payout-heading"
        >
            <h3 id="payout-heading" className="text-xl font-bold text-white mb-4">Payout Details</h3>
            <p className="text-zinc-400 mb-6 text-sm">
                We partner with Stripe to guarantee secure, direct payouts to your bank account.
                Your financial data is fully encrypted on Stripe’s network and is never stored on our servers.
            </p>

            {error && (
                <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="flex justify-center min-h-[100px] items-center mb-8" aria-live="polite">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <Motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-zinc-500 gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" aria-hidden="true" />
                            <span className="text-sm font-medium">Checking connection status...</span>
                        </Motion.div>
                    ) : isStripeConnected ? (
                        <Motion.div key="connected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" aria-hidden="true" />
                            <div className="text-center">
                                <h4 className="text-emerald-400 font-bold text-lg">Stripe Connected</h4>
                                <p className="text-emerald-500/70 text-xs mt-1">Your account is ready to receive payouts.</p>
                            </div>
                        </Motion.div>
                    ) : (
                        <Motion.div key="connect" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <button
                                type="button"
                                onClick={handleStripeConnect}
                                disabled={redirecting}
                                className="group flex items-center gap-2 px-8 py-3.5 bg-linear-to-b from-orange-400 to-orange-600 text-white font-bold text-lg rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 active:translate-y-0 border border-orange-400/50 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                            >
                                {redirecting ? (
                                    <><Loader2 className="h-5 w-5 animate-spin" /> Redirecting...</>
                                ) : (
                                    <><ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /> Connect via Stripe</>
                                )}
                            </button>
                        </Motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3">
                <button type="button" onClick={onPrev} disabled={redirecting} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl sm:rounded-full font-semibold text-zinc-400 hover:text-white transition-colors border border-zinc-800 sm:border-transparent disabled:opacity-50">
                    Back
                </button>
                <button type="button" onClick={onNext} disabled={!isStripeConnected || loading} className={`w-full sm:w-auto px-8 py-3 sm:py-2.5 rounded-xl sm:rounded-full font-bold shadow-lg transition-all transform ${isStripeConnected && !loading ? 'bg-blue-500 text-white hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                    Continue
                </button>
            </div>
        </Motion.section>
    );
};

export default PayoutDetails;