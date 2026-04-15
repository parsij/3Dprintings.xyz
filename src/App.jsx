import { useEffect, useState } from "react";
import "./App.css";
import Router from "./Router.jsx";
import axios from "axios";

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/auth", {
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

  if (loading) return <div>Loading...</div>;

  return <Router user={user} setUser={setUser} />;
};

export default App;