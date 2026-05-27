import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./routes/SignIn.jsx";
import SignUp from "./routes/SignUp.jsx";
import ForgotPassword from "./routes/ForgotPassword.jsx";
import ResetPassword from "./routes/ResetPassword.jsx";
import SellerDashboard from "./seller/routes/SellerDashboard.jsx";
import SellerInventory from "./seller/routes/SellerInventory.jsx";
import SellerOrders from "./seller/routes/SellerOrders.jsx";
import SellerPreferences from "./seller/routes/SellerPreferences.jsx";
import SellerReviews from "./seller/routes/SellerReviews.jsx";
import SellerOnboarding from "./seller/routes/SellerOnboarding.jsx";
import SellerBalance from "./seller/routes/SellerBalance.jsx";
import SellerBoxes from "./seller/routes/SellerBoxes.jsx";
import { BECOME_SELLER_URL } from "./config/api.js";
import { getSellerOnboardingStatus } from "./seller/services/sellerOnboardingService.js";

function hasSellerRole(user) {
  return String(user?.role || "").trim().toLowerCase() === "seller";
}

const ONBOARDING_ROUTE_BY_STEP = {
  stripe_connect: "/onboarding/stripe",
  shipping_origin: "/onboarding/shipping",
  first_box: "/onboarding/box",
  completed: null,
};

function ProtectedSellerRoute({ user, children, allowIncomplete = false }) {
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (user && !hasSellerRole(user)) {
      window.location.href = BECOME_SELLER_URL;
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadOnboarding() {
      if (!user || !hasSellerRole(user) || allowIncomplete) {
        if (!cancelled) {
          setCheckingOnboarding(false);
        }
        return;
      }

      try {
        const status = await getSellerOnboardingStatus();
        if (cancelled) return;
        setOnboardingStep(status?.completionStep || "shop_url");
      } catch {
        if (!cancelled) setOnboardingStep("shop_url");
      } finally {
        if (!cancelled) setCheckingOnboarding(false);
      }
    }

    loadOnboarding();
    return () => {
      cancelled = true;
    };
  }, [user, allowIncomplete]);

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!hasSellerRole(user)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="mx-3 text-gray-900">Loading ...</div>
        <div className="m-3 h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!allowIncomplete && checkingOnboarding) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="mx-3 text-gray-900">Checking seller setup...</div>
        <div className="m-3 h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!allowIncomplete && onboardingStep === "shop_url") {
    window.location.href = BECOME_SELLER_URL;
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="mx-3 text-gray-900">Redirecting to seller setup...</div>
      </div>
    );
  }

  if (!allowIncomplete && onboardingStep && onboardingStep !== "completed") {
    const redirectPath = ONBOARDING_ROUTE_BY_STEP[onboardingStep] || "/onboarding/stripe";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function SignInRoute({ user, setUser }) {
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <SignIn setUser={setUser} />;
}

const SellerRouter = ({ user, setUser }) => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/signin" element={<SignInRoute user={user} setUser={setUser} />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignUp setUser={setUser} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword setUser={setUser} />} />

        <Route
          path="/onboarding/shop"
          element={
            <ProtectedSellerRoute user={user} allowIncomplete>
              <Navigate to="/onboarding/stripe" replace />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/onboarding/stripe"
          element={
            <ProtectedSellerRoute user={user} allowIncomplete>
              <SellerOnboarding step="stripe_connect" />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/onboarding/shipping"
          element={
            <ProtectedSellerRoute user={user} allowIncomplete>
              <SellerOnboarding step="shipping_origin" />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/onboarding/box"
          element={
            <ProtectedSellerRoute user={user} allowIncomplete>
              <SellerOnboarding step="first_box" />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/onboarding/complete"
          element={
            <ProtectedSellerRoute user={user} allowIncomplete>
              <SellerOnboarding step="complete" />
            </ProtectedSellerRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedSellerRoute user={user}>
              <SellerDashboard user={user} />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedSellerRoute user={user}>
              <SellerInventory user={user} />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/preferences"
          element={
            <ProtectedSellerRoute user={user}>
              <SellerPreferences user={user} />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/reviews"
          element={
            <ProtectedSellerRoute user={user}>
              <SellerReviews user={user} />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedSellerRoute user={user}>
              <SellerOrders user={user} />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/balance"
          element={
            <ProtectedSellerRoute user={user}>
              <SellerBalance user={user} />
            </ProtectedSellerRoute>
          }
        />
        <Route
          path="/boxes"
          element={
            <ProtectedSellerRoute user={user}>
              <SellerBoxes user={user} />
            </ProtectedSellerRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default SellerRouter;
