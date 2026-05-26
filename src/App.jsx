import { useEffect, useState } from "react";
import "./App.css";
import Router from "./Router.jsx";
import SellerRouter from "./SellerRouter.jsx";
import axios from "axios";
import { ensureCsrfToken } from "./services/csrf.js";
import { API_BASE, isSellerHostname } from "./config/api.js";

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
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Keep your exact loading animation while the backend responds
  if (loading) return (
      <div className={"flex bg-gray-100 h-screen items-center justify-center "}>
        <div className={"text-gray-900 mx-3"}>Loading ...</div>
        <div className="h-12 w-12 animate-spin m-3 rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
      </div>
  );

  // The traffic controller switch
  if (isSellerSubdomain) {
    // If they typed seller.3dprintings.xyz, give them the seller layouts
    return <SellerRouter user={user} setUser={setUser} />;
  }

  // Otherwise, fallback to your original customer store routes
  return <Router user={user} setUser={setUser}/>;
};

export default App;