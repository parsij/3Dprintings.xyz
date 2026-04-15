import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./routes/Home.jsx";
import SignIn from "./routes/SignIn.jsx";
import SignUp from "./routes/SignUp.jsx";
import ForgotPassword from "./routes/ForgotPassword.jsx";
import Products from "./routes/Products.jsx";
import CartPage from "./routes/Cart.jsx";
import SubmitModel from "./routes/SubmitModel.jsx";
import AccountSettings from "./routes/AccountSettings.jsx";

const Router = ({ user, setUser }) => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home user={user} setUser={setUser} />} />
        <Route path="/signin" element={<SignIn setUser={setUser} />} />
        <Route path="/signup" element={<SignUp setUser={setUser} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/products" element={<Products user={user} />} />
        <Route path="/cart" element={<CartPage user={user} />} />
        <Route path="/create" element={<SubmitModel user={user} />} />
        <Route
          path="/account"
          element={user ? <AccountSettings user={user} setUser={setUser} /> : <Navigate to="/signin" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;