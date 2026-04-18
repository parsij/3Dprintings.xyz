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

  if (loading) return <div className={"flex bg-gray-100 h-screen items-center justify-center "}>
    <div className={"text-gray-900 mx-3"}>Loading ...</div>
    <div className="h-12 w-12 animate-spin m-3 rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
  </div>;

  return <Router user={user} setUser={setUser}/>;
};

export default App;