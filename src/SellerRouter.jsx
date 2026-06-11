import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { BECOME_SELLER_URL } from "./config/api.js";
import { getSellerOnboardingStatus } from "./seller/services/sellerOnboardingService.js";
import { resolveSellerSetupRoute } from "./seller/components/SellerSignUp/sellerSetupRouting.js";
import { useTheme } from "./ThemeContext.jsx";

const SignIn = lazy(() => import("./routes/SignIn.jsx"));
const SignUp = lazy(() => import("./routes/SignUp.jsx"));
const ForgotPassword = lazy(() => import("./routes/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./routes/ResetPassword.jsx"));
const SellerDashboard = lazy(() => import("./seller/routes/SellerDashboard.jsx"));
const SellerInventory = lazy(() => import("./seller/routes/SellerInventory.jsx"));
const SellerOrders = lazy(() => import("./seller/routes/SellerOrders.jsx"));
const SellerPreferences = lazy(() => import("./seller/routes/SellerPreferences.jsx"));
const SellerReviews = lazy(() => import("./seller/routes/SellerReviews.jsx"));
const SellerBalance = lazy(() => import("./seller/routes/SellerBalance.jsx"));
const SellerBoxes = lazy(() => import("./seller/routes/SellerBoxes.jsx"));
const Messages = lazy(() => import("./routes/Messages.jsx"));
const SellerSetup = lazy(() => import("./seller/components/SellerSignUp/SellerSetup.jsx"));

const ROUTE_BACKGROUNDS = {
  light: "#fff7ed",
  dark: "#09090b",
};

function ThemeLayout() {
  const { theme } = useTheme();

  useEffect(() => {
    const backgroundColor = ROUTE_BACKGROUNDS[theme];

    document.documentElement.style.backgroundColor = backgroundColor;
    document.body.style.backgroundColor = backgroundColor;

    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, [theme]);

  return <Outlet />;
}

function hasSellerRole(user) {
  return String(user?.role || "").trim().toLowerCase() === "seller";
}

function SellerRouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm font-bold text-gray-700">
      Loading seller page…
    </div>
  );
}

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
        <div className="mx-3 text-gray-900">Loading…</div>
        <div className="m-3 h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!allowIncomplete && checkingOnboarding) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="mx-3 text-gray-900">Checking seller setup…</div>
        <div className="m-3 h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!allowIncomplete && onboardingStep === "shop_url") {
    window.location.href = BECOME_SELLER_URL;
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="mx-3 text-gray-900">Redirecting to seller setup…</div>
      </div>
    );
  }

  if (!allowIncomplete && onboardingStep && onboardingStep !== "completed") {
    const redirectPath = resolveSellerSetupRoute(onboardingStep);
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
      <Suspense fallback={<SellerRouteFallback />}>
        <Routes>
          <Route element={<ThemeLayout />}>
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
                <SellerSetup step="stripe_connect" />
              </ProtectedSellerRoute>
            }
          />
          <Route
            path="/onboarding/shipping"
            element={
              <ProtectedSellerRoute user={user} allowIncomplete>
                <SellerSetup step="shipping_origin" />
              </ProtectedSellerRoute>
            }
          />
          <Route
            path="/onboarding/box"
            element={
              <ProtectedSellerRoute user={user}>
                <Navigate to="/boxes?new=1" replace />
              </ProtectedSellerRoute>
            }
          />
          <Route
            path="/onboarding/complete"
            element={
              <ProtectedSellerRoute user={user} allowIncomplete>
                <SellerSetup step="complete" />
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
          <Route
            path="/messages"
            element={
              <ProtectedSellerRoute user={user}>
                <Messages user={user} mode="seller" />
              </ProtectedSellerRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default SellerRouter;
