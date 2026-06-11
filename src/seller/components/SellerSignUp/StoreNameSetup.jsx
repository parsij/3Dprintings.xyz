import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
    checkShopNameAvailability,
    saveSellerShopOnboarding,
} from "../../services/sellerOnboardingService.js";
import { SHOP_NAME_MAX_LENGTH, validateShopName } from "../../../utils/shopName.js";
import { useEffect, useState } from "react";

const StoreNameSetup = ({ onNext }) => {
    const [shopName, setShopName] = useState("");
    const [shopNameError, setShopNameError] = useState("");
    const [checkingShopName, setCheckingShopName] = useState(false);
    const [shopNameAlternatives, setShopNameAlternatives] = useState([]);
    const [savingShop, setSavingShop] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    useEffect(() => {
        const trimmed = shopName.trim();
        const validationError = validateShopName(trimmed);

        if (!trimmed || validationError) {
            setShopNameError(validationError || "");
            setShopNameAlternatives([]);
            return undefined;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setCheckingShopName(true);
            try {
                const result = await checkShopNameAvailability(trimmed);
                if (cancelled) return;

                if (!result?.available) {
                    setShopNameError("Shop name is already taken.");
                    setShopNameAlternatives(Array.isArray(result?.alternatives) ? result.alternatives.slice(0, 5) : []);
                } else {
                    setShopNameError("");
                    setShopNameAlternatives([]);
                }
            } catch {
                if (!cancelled) {
                    setShopNameError("Failed to check availability. Please try again.");
                    setShopNameAlternatives([]);
                }
            } finally {
                if (!cancelled) {
                    setCheckingShopName(false);
                }
            }
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [shopName]);

    const handleAlternativeSelect = (alternative) => {
        setShopName(alternative);
        setShopNameError("");
        setShopNameAlternatives([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmed = shopName.trim();
        const validationError = validateShopName(trimmed);
        if (validationError) {
            setShopNameError(validationError);
            return;
        }

        setSavingShop(true);
        try {
            const result = await saveSellerShopOnboarding({
                shopName: trimmed,
                termsOfServiceAccepted: termsAccepted,
            });
            onNext(result);
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to save shop details. Please try again.";
            const alternatives = error?.response?.data?.alternatives;
            setShopNameError(message);
            setShopNameAlternatives(Array.isArray(alternatives) ? alternatives.slice(0, 5) : []);
        } finally {
            setSavingShop(false);
        }
    };

    const isFormValid = shopName.trim() && !shopNameError && !checkingShopName && !savingShop && termsAccepted;

    return (
        <Motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full text-left"
            aria-labelledby="setup-heading"
        >
            <h3 id="setup-heading" className="text-xl font-bold text-white mb-4">Name Your Public Shop</h3>

            <div className="space-y-4">
                {/* Store Name Input */}
                <div>
                    <label htmlFor="shopName" className="text-xs text-zinc-400 font-semibold uppercase block mb-2">
                        Shop Name
                    </label>
                    <div className="relative">
                        <input
                            id="shopName"
                            name="shopName"
                            type="text"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            maxLength={SHOP_NAME_MAX_LENGTH}
                            aria-invalid={!!shopNameError}
                            aria-describedby={shopNameError ? "shopName-error" : undefined}
                            className={`w-full bg-zinc-800 border ${
                                shopNameError ? 'border-red-500' : 'border-zinc-700'
                            } rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors`}
                            placeholder="LayerLab Prints"
                            required
                        />

                        {/* Loading Indicator */}
                        {checkingShopName && (
                            <span className="absolute right-4 top-3.5 text-zinc-400 flex items-center">
                                <span className="sr-only">Checking name availability…</span>
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                    style={{ animation: 'ios-spin 1s steps(12, end) infinite' }}
                                >
                                    <style>
                                        {`@keyframes ios-spin { 100% { transform: rotate(360deg); } }`}
                                    </style>
                                    <g fill="#8e8e93">
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.1" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.17" transform="rotate(30 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.25" transform="rotate(60 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.33" transform="rotate(90 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.41" transform="rotate(120 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.5" transform="rotate(150 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.58" transform="rotate(180 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.66" transform="rotate(210 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.75" transform="rotate(240 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.83" transform="rotate(270 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="0.91" transform="rotate(300 12 12)" />
                                        <rect x="11" y="1" width="2" height="6" rx="1" opacity="1" transform="rotate(330 12 12)" />
                                    </g>
                                </svg>
                            </span>
                        )}
                    </div>

                    {/* LIVE REGION: Dynamic Errors and Alternatives */}
                    <div aria-live="polite" aria-atomic="true">
                        {shopNameError && shopName.trim().length > 0 && !checkingShopName && (
                            <p id="shopName-error" role="alert" className="text-red-400 text-xs mt-2 font-medium">
                                {shopNameError}
                            </p>
                        )}

                        {shopNameAlternatives.length > 0 && !checkingShopName && (
                            <div className="mt-3">
                                <p id="alternatives-heading" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Try one of these available names
                                </p>
                                <ul aria-labelledby="alternatives-heading" className="mt-2 flex flex-wrap gap-2">
                                    {shopNameAlternatives.map((alternative) => (
                                        <li key={alternative}>
                                            <button
                                                type="button"
                                                onClick={() => handleAlternativeSelect(alternative)}
                                                aria-label={`Select alternative name: ${alternative}`}
                                                className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20"
                                            >
                                                {alternative}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Terms and policy acceptance */}
                <div className="flex items-start pt-2">
                    <input
                        type="checkbox"
                        id="terms"
                        name="terms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-blue-500 bg-zinc-800 border-zinc-700 rounded focus:ring-blue-500 focus:ring-offset-zinc-900 cursor-pointer"
                        required
                        aria-required="true"
                    />
                    <div className="ml-2 text-sm leading-6 text-zinc-400">
                        <label htmlFor="terms" className="cursor-pointer select-none">
                            I accept the marketplace terms for selling physical prints and digital files.
                        </label>{" "}
                        <Link to="/terms" className="font-bold text-blue-300 underline underline-offset-4 hover:text-blue-200">
                            Terms
                        </Link>{" "}
                        <span aria-hidden="true">/</span>{" "}
                        <Link to="/privacy" className="font-bold text-blue-300 underline underline-offset-4 hover:text-blue-200">
                            Privacy
                        </Link>
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
                <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full sm:w-auto px-8 py-3 sm:py-2.5 rounded-xl sm:rounded-full font-bold shadow-lg transition-all duration-200 transform ${
                        isFormValid
                            ? 'bg-white text-black hover:bg-zinc-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    }`}
                >
                    {savingShop ? "Saving…" : "Continue"}
                </button>
            </div>
        </Motion.form>
    );
};

export default StoreNameSetup;
