import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./routes/Home.jsx";
import SignIn from "./routes/SignIn.jsx";
import SignUp from "./routes/SignUp.jsx";
import ForgotPassword from "./routes/ForgotPassword.jsx";
import Products from "./routes/Products.jsx";
import ProductPage from "./routes/ProductPage.jsx";
import CartPage from "./routes/Cart.jsx";
import SubmitModel from "./routes/SubmitModel.jsx";
import AccountSettings from "./routes/AccountSettings.jsx";
import SearchResults from "./routes/SearchResults.jsx";
import LikedProducts from "./routes/LikedProducts.jsx";
import SavedProducts from "./routes/SavedProducts.jsx";
import YourReviews from "./routes/YourReviews.jsx";
import Checkout from "./components/Checkout.jsx";
import PaymentSuccess from "./routes/PaymentSuccess.jsx";
import PaymentCancel from "./routes/PaymentCancel.jsx";
import SellerDashboard from "./routes/SellerDashboard.jsx";
import BecomeSeller from "./routes/BecomeSeller.jsx";

const MAIN_SITE_ORIGIN = "https://3dprintings.xyz";
const SELLER_SITE_ORIGIN = "https://seller.3dprintings.xyz";

function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

function SignInRoute({ user, setUser }) {
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next");

  if (user) {
    if (next === "seller") {
      if (String(user.role || "").toLowerCase() === "seller") {
        return <ExternalRedirect to={SELLER_SITE_ORIGIN} />;
      }
      return <Navigate to="/become-seller" replace />;
    }

    return <Navigate to="/account" replace />;
  }

  return <SignIn setUser={setUser} postLoginSellerFlow={next === "seller"} />;
}

const Router = ({ user, setUser }) => {
  const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const isSellerHost = hostname === "seller.3dprintings.xyz";
  const defaultPath = isSellerHost ? "/" : "/home";
  const isSellerUser = String(user?.role || "").toLowerCase() === "seller";

  if (isSellerHost && !user) {
    return <ExternalRedirect to={`${MAIN_SITE_ORIGIN}/signin?next=seller`} />;
  }

  if (isSellerHost && user && !isSellerUser) {
    return <ExternalRedirect to={`${MAIN_SITE_ORIGIN}/become-seller`} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={isSellerHost ? <SellerDashboard /> : <Navigate to={defaultPath} replace />}
        />
        <Route
          path="/home"
          element={isSellerHost ? <Navigate to="/" replace /> : <Home user={user} setUser={setUser} />}
        />
        <Route
          path="/signin"
          element={<SignInRoute user={user} setUser={setUser} />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/account" replace /> : <SignUp setUser={setUser} />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/products" element={<Products user={user} />} />
        <Route path="/search" element={<SearchResults user={user} />} />
        <Route path="/liked-products" element={<LikedProducts user={user} />} />
        <Route path="/saved-products" element={<SavedProducts user={user} />} />
        <Route path="/your-reviews" element={<YourReviews user={user} />} />
        <Route path="/product/:id" element={<ProductPage user={user} />} />
        <Route path="/cart" element={<CartPage user={user} />} />
        <Route path="/checkout" element={user ? <Checkout /> : <Navigate to="/signin" replace />} />
        <Route path="/success" element={user ? <PaymentSuccess user={user} /> : <Navigate to="/signin" replace />} />
        <Route path="/cancel" element={<PaymentCancel />} />
        <Route path="/create" element={<SubmitModel user={user} />} />
        <Route path="/become-seller" element={user ? <BecomeSeller /> : <Navigate to="/signin" replace />} />
        <Route
          path="/seller"
          element={user ? (isSellerUser ? <Navigate to="/" replace /> : <Navigate to="/become-seller" replace />) : <Navigate to="/signin" replace />}
        />
        <Route
          path="/account/*"
          element={user ? <AccountSettings user={user} setUser={setUser} /> : <Navigate to="/signin" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
