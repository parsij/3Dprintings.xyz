import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import BecomeSeller from "./routes/BecomeSeller.jsx";
import ShopInfo from "./routes/shopInfo.jsx";
import Messages from "./routes/Messages.jsx";

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
        <Route path="/" element={<Navigate to="/home" replace />} /> {/* Redirect root to home */}
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
        <Route path="/become-seller" element={user ? <BecomeSeller user={user} setUser={setUser} /> : <Navigate to="/signin" replace />} />
        <Route
          path="/account/*"
          element={user ? <AccountSettings user={user} setUser={setUser} /> : <Navigate to="/signin" replace />}
        />
        {/* Catch-all for any unmatched routes */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
