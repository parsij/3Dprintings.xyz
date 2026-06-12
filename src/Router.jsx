import { lazy, Suspense, useEffect } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useTheme } from "./ThemeContext.jsx";

const Home = lazy(() => import("./routes/Home.jsx"));
const SignIn = lazy(() => import("./routes/SignIn.jsx"));
const SignUp = lazy(() => import("./routes/SignUp.jsx"));
const ForgotPassword = lazy(() => import("./routes/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./routes/ResetPassword.jsx"));
const Products = lazy(() => import("./routes/Products.jsx"));
const ProductPage = lazy(() => import("./routes/ProductPage.jsx"));
const CartPage = lazy(() => import("./routes/Cart.jsx"));
const AccountSettings = lazy(() => import("./routes/AccountSettings.jsx"));
const SearchResults = lazy(() => import("./routes/SearchResults.jsx"));
const LikedProducts = lazy(() => import("./routes/LikedProducts.jsx"));
const SavedProducts = lazy(() => import("./routes/SavedProducts.jsx"));
const YourReviews = lazy(() => import("./routes/YourReviews.jsx"));
const Checkout = lazy(() => import("./components/Checkout.jsx"));
const PaymentSuccess = lazy(() => import("./routes/PaymentSuccess.jsx"));
const PaymentCancel = lazy(() => import("./routes/PaymentCancel.jsx"));
const BecomeSellerLandingPage = lazy(() => import("./seller/components/SellerSignUp/NewSellerLandingPage.jsx"));
const ShopInfo = lazy(() => import("./routes/shopInfo.jsx"));
const Messages = lazy(() => import("./routes/Messages.jsx"));
const TermsOfService = lazy(() => import("./routes/TermsOfService.jsx"));
const PrivacyPolicy = lazy(() => import("./routes/PrivacyPolicy.jsx"));
const StepperWithSetup = lazy(() => import("./seller/components/SellerSignUp/StepperWithSetup.jsx"));

const ROUTE_BACKGROUNDS = {
  light: "#fff7ed",
  dark: "#09090b",
};

function RouteFallback() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default" }}>
      <Stack alignItems="center" spacing={2}>
        <CircularProgress color="secondary" size={42} />
        <Typography color="text.secondary" fontWeight={800}>
          Loading page…
        </Typography>
      </Stack>
    </Box>
  );
}

// Keeps scroll bounce and route transitions aligned with the saved site theme.
const ThemeLayout = ({ forceDark = false }) => {
  const { theme } = useTheme();
  const routeTheme = forceDark ? "dark" : theme;

  useEffect(() => {
    const backgroundColor = ROUTE_BACKGROUNDS[routeTheme];

    document.documentElement.style.backgroundColor = backgroundColor;
    document.body.style.backgroundColor = backgroundColor;

    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, [routeTheme]);

  return <Outlet />;
};

function SignInRoute({ user, setUser }) {
  if (user) {
    return <Navigate to="/account" replace />;
  }
  return <SignIn setUser={setUser} />;
}

const Router = ({ user, setUser }) => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<ThemeLayout forceDark />}>
            <Route
              path="/become-seller"
              element={user ? <BecomeSellerLandingPage user={user} setUser={setUser} /> : <Navigate to="/signin" replace />}
            />
            <Route
              path="/become-seller/info"
              element={user ? <StepperWithSetup user={user} setUser={setUser} /> : <Navigate to="/signin" replace />}
            />
          </Route>

          <Route element={<ThemeLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home user={user} setUser={setUser} />} />
            <Route path="/signin" element={<SignInRoute user={user} setUser={setUser} />} />
            <Route path="/signup" element={user ? <Navigate to="/account" replace /> : <SignUp setUser={setUser} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword setUser={setUser} />} />
            <Route path="/products" element={<Products user={user} />} />
            <Route path="/search" element={<SearchResults user={user} />} />
            <Route path="/liked-products" element={<LikedProducts user={user} />} />
            <Route path="/saved-products" element={<SavedProducts user={user} />} />
            <Route path="/your-reviews" element={<YourReviews user={user} />} />
            <Route path="/messages" element={user ? <Messages user={user} /> : <Navigate to="/signin" replace />} />
            <Route path="/terms" element={<TermsOfService user={user} />} />
            <Route path="/privacy" element={<PrivacyPolicy user={user} />} />
            <Route path="/product/:id" element={<ProductPage user={user} />} />
            <Route path="/shop/:shopName" element={<ShopInfo user={user} />} />
            <Route path="/cart" element={<CartPage user={user} />} />
            <Route path="/checkout" element={user ? <Checkout /> : <Navigate to="/signin" replace />} />
            <Route path="/success" element={user ? <PaymentSuccess user={user} /> : <Navigate to="/signin" replace />} />
            <Route path="/cancel" element={<PaymentCancel />} />
            <Route
              path="/account/*"
              element={user ? <AccountSettings user={user} setUser={setUser} /> : <Navigate to="/signin" replace />}
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default Router;
