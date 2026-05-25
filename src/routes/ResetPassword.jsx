import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ResetPassword({ setUser }) {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [resetSessionToken, setResetSessionToken] = useState("");

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!passwordRule.test(form.password)) {
      nextErrors.password = "Use 8+ characters with uppercase, lowercase, and a number.";
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  }, [form]);

  const canSubmit = resetSessionToken && Object.keys(errors).length === 0 && !isSubmitting;

  useEffect(() => {
    let isMounted = true;

    async function consumeResetLink() {
      try {
        const response = await axios.post(
          `${API_BASE}/api/password-reset/consume`,
          { token },
          { withCredentials: true }
        );

        if (isMounted) {
          setResetSessionToken(response.data?.resetSessionToken || "");
          setIsCheckingLink(false);
        }
      } catch {
        if (isMounted) {
          navigate("/signin", {
            replace: true,
            state: { message: "Expired link. Please request a new password reset link." },
          });
        }
      }
    }

    if (!token) {
      navigate("/signin", {
        replace: true,
        state: { message: "Expired link. Please request a new password reset link." },
      });
    } else {
      consumeResetLink();
    }

    return () => {
      isMounted = false;
    };
  }, [navigate, token]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    setMessage("");
    setIsError(false);

    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${API_BASE}/api/password-reset/confirm`,
        { resetSessionToken, password: form.password },
        { withCredentials: true }
      );

      if (response.data?.user && setUser) {
        setUser(response.data.user);
      }

      setMessage("Password reset successfully.");
      const isSellerSubdomain = window.location.hostname.startsWith("seller.");
      const nextPath = isSellerSubdomain ? "/dashboard" : "/account";
      setTimeout(() => navigate(nextPath, { replace: true }), 800);
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || "Could not reset password. Please request a new link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-orange-50 text-gray-900 flex items-center justify-center px-4">
      <SmallNavBar />
      <SideMenu />
      <section className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 sm:p-8 shadow-xl animate-fade-in-up">
        {isCheckingLink ? (
          <div className="text-center text-sm text-gray-700">Checking reset link...</div>
        ) : (
          <>
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Change your <span className="text-orange-500">password</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter a new password for your 3D Printings account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label className="mb-1 block text-sm text-gray-700 font-semibold">
              New password
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Enter new password"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
            />
            <p className="mt-1 min-h-[16px] text-xs text-red-500">
              {touched && errors.password ? errors.password : ""}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 font-semibold">
              Confirm password
            </label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={onChange}
              placeholder="Repeat new password"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
            />
            <p className="mt-1 min-h-[16px] text-xs text-red-500">
              {touched && errors.confirmPassword ? errors.confirmPassword : ""}
            </p>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-xl py-3 font-semibold text-white transition-all duration-300 ${
              canSubmit
                ? "cursor-pointer bg-orange-500 hover:bg-orange-400 active:scale-95 shadow-md hover:shadow-lg"
                : "bg-gray-300 cursor-not-allowed opacity-70"
            }`}
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>

          {message && (
            <p className={`text-sm ${isError ? "text-red-600" : "text-green-700"}`}>
              {message}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Need a new link?{" "}
          <Link
            to="/forgot-password"
            className="font-semibold text-orange-500 hover:text-orange-400 transition-colors"
          >
            Request another reset
          </Link>
        </p>
          </>
        )}
      </section>
    </main>
  );
}
