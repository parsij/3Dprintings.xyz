import { BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import React from 'react'
import Home from "./routes/Home.jsx";
import SignIn from "./routes/SignIn.jsx";
import SignUp from "./routes/SignUp.jsx";
import ForgotPassword from "./routes/ForgotPassword.jsx";
import Products from "./routes/Products.jsx";
import CartPage from "./routes/Cart.jsx";

const Router = () => {
    return (
            <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/products" element={<Products />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </BrowserRouter>
    )
}
export default Router
