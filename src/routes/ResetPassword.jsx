import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PasswordEye from "../assets/PasswordEye.svg";
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
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });
  const [activeField, setActiveField] = useState(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [resetSessionToken, setResetSessionToken] = useState("");

  const validators = useMemo(
    () => ({
      password: (value) => passwordRule.test(value),
      confirmPassword: (value) => value.length > 0 && value === form.password,
    }),
    [form.password]
  );

  const fieldErrors = {
    password: "Use 8+ characters with uppercase, lowercase, and a number.",
    confirmPassword: "Passwords do not match.",
  };

  const isFieldValid = (name) => validators[name](form[name]);
  const shouldShowError = (name) => ((activeField === name) || touched[name]) && !isFieldValid(name);
  const isFormValid = Object.keys(validators).every((name) => isFieldValid(name));
  const canSubmit = Boolean(resetSessionToken) && isFormValid && !isSubmitting;

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
    setTouched({
      password: true,
      confirmPassword: true,
    });
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
                <div className="relative">
                  <input
                    name="password"
                    type={showPasswords ? "text" : "password"}
                    value={form.password}
                    onChange={onChange}
                    onFocus={() => setActiveField("password")}
                    onBlur={() => setActiveField(null)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-20 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
                  {form.password && isFieldValid("password") && (
                    <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg no-bounce">
                      ✓
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPasswords((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 active:scale-95 opacity-70 hover:opacity-100"
                  >
                    <img src={PasswordEye} alt="Password visibility changer" className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 min-h-[16px] text-xs text-red-500">
                  {shouldShowError("password") ? fieldErrors.password : ""}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-700 font-semibold">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showPasswords ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={onChange}
                    onFocus={() => setActiveField("confirmPassword")}
                    onBlur={() => setActiveField(null)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
                  {form.confirmPassword && isFieldValid("confirmPassword") && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg no-bounce">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mt-1 min-h-[16px] text-xs text-red-500">
                  {shouldShowError("confirmPassword") ? fieldErrors.confirmPassword : ""}
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
              Don't want to change your password?{" "}
              <Link
                to="/signin"
                className="font-semibold text-orange-500 hover:text-orange-400 transition-colors"
              >
                Go Back to sign in
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
