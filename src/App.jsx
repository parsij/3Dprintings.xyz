import { Suspense, lazy, useEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import { ensureCsrfToken } from "./services/csrf.js";
import { API_BASE, isSellerHostname } from "./config/api.js";
import { AuthProvider } from "./AuthContext.jsx";
import { clearChatAuthSession, ensureChatAuthSession } from "./services/chatAuthService.js";

const Router = lazy(() => import("./Router.jsx"));
const SellerRouter = lazy(() => import("./SellerRouter.jsx"));

function LoadingScreen({ label = "Loading…" }) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="mx-3 text-gray-900">{label}</div>
      <div className="m-3 h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
    </div>
  );
}

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get the domain name from the browser address bar
  const hostname = window.location.hostname;
  const isSellerSubdomain = isSellerHostname(hostname);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await ensureCsrfToken(API_BASE);
        // FIXED: Cleaned up the path to use the proxy structure correctly
        const response = await axios.get(`${API_BASE}/api/auth`, {
          withCredentials: true,
        });
        setUser(response.data.user);
      } catch {
        setUser(null);
        clearChatAuthSession();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      clearChatAuthSession();
      return;
    }

    ensureChatAuthSession().catch((error) => {
      console.error("Failed to initialize chat session:", error);
    });
  }, [user]);

  // Keep your exact loading animation while the backend responds
  if (loading) return <LoadingScreen />;

  // The traffic controller switch
  if (isSellerSubdomain) {
    return (
      <AuthProvider user={user} setUser={setUser}>
        <Suspense fallback={<LoadingScreen label="Loading seller portal…" />}>
          <SellerRouter user={user} setUser={setUser} />
        </Suspense>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider user={user} setUser={setUser}>
      <Suspense fallback={<LoadingScreen label="Loading marketplace…" />}>
        <Router user={user} setUser={setUser} />
      </Suspense>
    </AuthProvider>
  );
};

export default App;
