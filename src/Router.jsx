import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Route Imports
import Home from "./routes/Home.jsx";
import SignIn from "./routes/SignIn.jsx";
import SignUp from "./routes/SignUp.jsx";
import ForgotPassword from "./routes/ForgotPassword.jsx";
import ResetPassword from "./routes/ResetPassword.jsx";
import Products from "./routes/Products.jsx";
import ProductPage from "./routes/ProductPage.jsx";
import CartPage from "./routes/Cart.jsx";
import AccountSettings from "./routes/AccountSettings.jsx";
import SearchResults from "./routes/SearchResults.jsx";
import LikedProducts from "./routes/LikedProducts.jsx";
import SavedProducts from "./routes/SavedProducts.jsx";
import YourReviews from "./routes/YourReviews.jsx";
import Checkout from "./components/Checkout.jsx";
import PaymentSuccess from "./routes/PaymentSuccess.jsx";
import PaymentCancel from "./routes/PaymentCancel.jsx";
import BecomeSellerLandingPage from "./seller/components/SellerSignUp/NewSellerLandingPage.jsx";
import ShopInfo from "./routes/shopInfo.jsx";
import Messages from "./routes/Messages.jsx";
import StepperWithSetup from "./seller/components/SellerSignUp/StepperWithSetup.jsx";
import { useTheme } from "./ThemeContext.jsx";

const ROUTE_BACKGROUNDS = {
  light: "#fff7ed",
  dark: "#09090b",
};

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
    // If user is logged in, redirect to account page or home
    return <Navigate to="/account" replace />;
  }
  return <SignIn setUser={setUser} />;
}

const Router = ({ user, setUser }) => {
  return (
      <BrowserRouter>
        <Routes>

          {/* ========================================== */}
          {/* DARK THEME ROUTES                          */}
          {/* ========================================== */}
          <Route element={<ThemeLayout forceDark />}>
            <Route
                path="/become-seller"
                element={user ? <BecomeSellerLandingPage user={user} setUser={setUser} /> : <Navigate to="/signin" replace />}
            />
            <Route
              path="/become-seller/info"
              element={user ? <StepperWithSetup user={user} setUser={setUser} /> : <Navigate to="/signin" replace />}
          />
            {/* If you build more dark pages later, just drop them in here! */}
          </Route>

          {/* ========================================== */}
          {/* LIGHT THEME ROUTES */}
          {/* ========================================== */}
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

            {/* Catch-all for any unmatched routes */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>

        </Routes>
      </BrowserRouter>
  );
};

export default Router;
