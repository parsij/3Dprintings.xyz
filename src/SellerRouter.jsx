import { useEffect } from "react"; // Added for safe side-effects
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./routes/SignIn.jsx";
import SignUp from "./routes/SignUp.jsx";
import ForgotPassword from "./routes/ForgotPassword.jsx";
import ResetPassword from "./routes/ResetPassword.jsx";

// FIXED: Corrected path imports from absolute "/" to relative "./routes/"
import SellerDashboard from "./seller/routes/SellerDashboard.jsx";
import SellerInventory from "./seller/routes/SellerInventory.jsx";
import SellerOrders from "./seller/routes/SellerOrders.jsx";
import SellerPreferences from "./seller/routes/SellerPreferences.jsx";
import SellerReviews from "./seller/routes/SellerReviews.jsx";
import { BECOME_SELLER_URL } from "./config/api.js";
// Safety Wrapper: Ensures the user is logged in AND is actually a seller
function hasSellerRole(user) {
    return String(user?.role || "").trim().toLowerCase() === "seller";
}

function ProtectedSellerRoute({ user, children }) {

    useEffect(() => {
        if (user && !hasSellerRole(user)) {
            window.location.href = BECOME_SELLER_URL;
        }
    }, [user]);

    if (!user) {
        return <Navigate to="/signin" replace />;
    }

    if (!hasSellerRole(user)) {
        // Show a temporary transition screen while the useEffect runs the redirect
        return (
            <div className={"flex bg-gray-100 h-screen items-center justify-center "}>
                <div className={"text-gray-900 mx-3"}>Loading ...</div>
                <div className="h-12 w-12 animate-spin m-3 rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
            </div>
        );
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
                {/* Root path on seller subdomain redirects straight to the seller dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Authentication Routes (Mirrored from main app, but redirecting to dashboard upon login) */}
                <Route path="/signin" element={<SignInRoute user={user} setUser={setUser} />} />
                <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignUp setUser={setUser} />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword setUser={setUser} />} />

                {/* Protected Seller Workflows */}
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

                {/* Catch-all for unmatched seller paths redirects back to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default SellerRouter;
