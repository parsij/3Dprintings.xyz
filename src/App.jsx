import { Suspense, lazy, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
      }}
    >
      <Stack alignItems="center" spacing={2.25}>
        <CircularProgress color="secondary" thickness={4.5} size={52} />
        <Typography color="text.primary" fontWeight={800}>
          {label}
        </Typography>
      </Stack>
    </Box>
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
