import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function BecomeSeller() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleBecomeSeller = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(`${API_BASE}/api/seller/become`, {}, {
        withCredentials: true,
      });

      setMessage(response.data?.message || "seller access granted.");
      setTimeout(() => {
        navigate("/seller");
      }, 500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to become a seller.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SmallNavBar />
      <SideMenu />

      <main className="min-h-screen bg-orange-50 px-4 pb-12 pt-24 text-gray-900">
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-orange-100 bg-white p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Become a Seller</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upgrade your account to seller access and start using the seller dashboard.
          </p>

          {message ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleBecomeSeller}
            disabled={loading}
            className={`mt-6 w-full rounded-xl py-3 font-semibold text-white transition-all duration-300 ${
              loading
                ? "cursor-not-allowed bg-orange-300 opacity-70"
                : "cursor-pointer bg-orange-500 hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            }`}
          >
            {loading ? "Updating..." : "Become a seller"}
          </button>
        </section>
      </main>
    </>
  );
}
