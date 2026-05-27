import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import { IS_LOCAL_DEV, SELLER_SITE_ORIGIN } from "../config/api.js";
import { saveSellerShopOnboarding } from "../seller/services/sellerOnboardingService.js";

export default function BecomeSeller({ setUser }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shopName, setShopName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await saveSellerShopOnboarding({
        shopName: shopName.trim(),
        termsOfServiceAccepted: termsAccepted,
      });

      if (response?.user) {
        setUser(response.user);
      }

      if (IS_LOCAL_DEV || window.location.hostname.endsWith("3dprintings.xyz")) {
        window.location.assign(`${SELLER_SITE_ORIGIN}/onboarding/stripe`);
        return;
      }
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start seller onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SmallNavBar />
      <SideMenu />

      <main className="min-h-screen bg-orange-50 px-4 pb-12 pt-24 text-gray-900">
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-orange-100 bg-white p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Become a Seller</h1>
          <p className="mt-2 text-sm text-gray-600">
            Choose your shop name, accept the seller terms, then complete Stripe Connect and shipping setup.
          </p>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="shopName" className="mb-1 block text-sm font-semibold text-gray-700">
                Shop name *
              </label>
              <input
                id="shopName"
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
                maxLength={30}
                placeholder="My 3D Shop"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                required
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                className="mt-1"
                required
              />
              <span>I agree to the Seller Terms of Service.</span>
            </label>

            <button
              type="submit"
              disabled={loading || !termsAccepted || shopName.trim().length < 3}
              className={`w-full rounded-xl py-3 font-semibold text-white transition-all duration-300 ${
                loading
                  ? "cursor-not-allowed bg-orange-300 opacity-70"
                  : "cursor-pointer bg-orange-500 hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              }`}
            >
              {loading ? "Saving..." : "Continue to Stripe Connect"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
