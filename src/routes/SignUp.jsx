import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import PasswordEye from "../assets/PasswordEye.svg"
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import Seo from "../components/Seo.jsx";
import axios from "axios";
import { API_BASE } from "../config/api.js";

function getSignupErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Signup failed. Please try again."
  );
}

function getSignupErrorField(message) {
  const lower = String(message || "").toLowerCase();
  if (lower.includes("email")) return "email";
  if (lower.includes("password")) return "password";
  if (lower.includes("username")) return "username";
  return null;
}

export default function SignUp({ setUser }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [activeField, setActiveField] = useState(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validators = {
    username: (v) => v.trim().length >= 3,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    password: (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v),
    confirmPassword: (v) => v.length > 0 && v === form.password,
  };

  const fieldErrors = {
    username: "Enter a username with 3 characters or more.",
    email: "Enter a valid email address.",
    password:
      "Enter a password with at least 8 characters, including uppercase, lowercase, and a number.",
    confirmPassword: "Enter the same password again.",
  };

  const isFieldValid = (name) => validators[name](form[name]);

  const isFormValid = Object.keys(validators).every((name) =>
    validators[name](form[name])
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSubmitMessage("");
    setSubmitError(false);
    setServerFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const getDisplayedFieldError = (name) => {
    if (serverFieldErrors[name]) return serverFieldErrors[name];
    if ((activeField === name || touched[name]) && !isFieldValid(name)) {
      return fieldErrors[name];
    }
    return "";
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    setSubmitMessage("");
    setSubmitError(false);
    setServerFieldErrors({});

    if (!isFormValid) {
      setSubmitError(true);
      setSubmitMessage("Fix the highlighted fields before continuing.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${API_BASE}/api/signup`,
        {
          username: form.username,
          email: form.email,
          password: form.password},
        {
          withCredentials: true,
        }
      );

      setUser(response.data.user);
      navigate("/home", { replace: true });
    } catch (error) {
      const message = getSignupErrorMessage(error);
      const errorField = getSignupErrorField(message);

      setSubmitError(true);
      setSubmitMessage(message);

      if (errorField) {
        setServerFieldErrors({ [errorField]: message });
        setTouched((prev) => ({ ...prev, [errorField]: true }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title="Create Account"
        description="Create a 3Dprintings.xyz account to buy physical 3D printed products, save listings, message sellers, and download model files."
        path="/signup"
        noIndex
      />
      <SmallNavBar />
      <SideMenu />
      <main id="main-content" className="site-shell min-h-screen text-gray-900 flex items-center justify-center px-4 py-28">
        <section className="w-full max-w-md rounded-[2rem] border border-orange-100 bg-white/88 p-6 shadow-[0_24px_80px_rgba(17,24,39,0.12)] backdrop-blur sm:p-8 animate-fade-in-up">
          <div className="mb-6 text-center group">
            <h1 className="font-display text-3xl font-black tracking-tight">
              Join{" "}
              <span className="text-orange-500 group-hover:text-orange-600 transition-colors duration-300">
                3Dprintings.xyz
              </span>
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
              Buy physical prints, save files, message makers, and track orders from one account.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="group transition-all duration-300 hover:translate-x-1">
              <label className="mb-1 block text-sm text-gray-700 font-semibold group-hover:text-orange-600 transition-colors duration-300">
                Username
              </label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={onChange}
                  onFocus={() => setActiveField("username")}
                  onBlur={() => setActiveField(null)}
                  placeholder="yourname"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
                />
                {form.username && isFieldValid("username") && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg no-bounce">
                    ✓
                  </span>
                )}
                {form.username && isFieldValid("username") && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg">
                    ✓
                  </span>
                )}
              </div>
              <p className={`mt-1 min-h-4 text-xs transition-all duration-300 ${getDisplayedFieldError("username") ? "text-red-500" : "text-red-400"}`}>
                {getDisplayedFieldError("username")}
              </p>
            </div>

            <div className="group transition-all duration-300 hover:translate-x-1">
              <label className="mb-1 block text-sm text-gray-700 font-semibold group-hover:text-orange-600 transition-colors duration-300">
                Email
              </label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField(null)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
                />
                {form.email && isFieldValid("email") && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg no-bounce">
                    ✓
                  </span>
                )}
                {form.email && isFieldValid("email") && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg">
                    ✓
                  </span>
                )}
              </div>
              <p className={`mt-1 min-h-[16px] text-xs transition-all duration-300 ${getDisplayedFieldError("email") ? "text-red-500" : "text-red-400"}`}>
                {getDisplayedFieldError("email")}
              </p>
            </div>

            <div className="group transition-all duration-300 hover:translate-x-1">
              <label className="mb-1 block text-sm text-gray-700 font-semibold group-hover:text-orange-600 transition-colors duration-300">
                Password
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 active:scale-95 opacity-70 hover:opacity-100"
                >
                  <img src={PasswordEye} alt="Password visibility changer" className="h-5 w-5" />
                </button>
                {form.password && isFieldValid("password") && (
                  <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg no-bounce">
                    ✓
                  </span>
                )}
              </div>
              <p className={`mt-1 text-xs transition-all duration-300 ${getDisplayedFieldError("password") ? "text-red-500" : "text-red-400"}`}>
                {getDisplayedFieldError("password")}
              </p>
            </div>

            <div className="group transition-all duration-300 hover:translate-x-1">
              <label className="mb-1 block text-sm text-gray-700 font-semibold group-hover:text-orange-600 transition-colors duration-300">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={onChange}
                  onFocus={() => setActiveField("confirmPassword")}
                  onBlur={() => setActiveField(null)}
                  placeholder="Repeat password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
                />
                {form.confirmPassword && isFieldValid("confirmPassword") && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg no-bounce">
                    ✓
                  </span>
                )}
              </div>
              <p className={`mt-1 min-h-4 text-xs transition-all duration-300 ${getDisplayedFieldError("confirmPassword") ? "text-red-500" : "text-red-400"}`}>
                {getDisplayedFieldError("confirmPassword")}
              </p>
            </div>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full rounded-xl py-3 font-semibold text-white transition-all duration-300 ${
                isFormValid && !isSubmitting
                  ? "cursor-pointer bg-orange-500 hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                  : "bg-gray-300 cursor-not-allowed opacity-70"
              }`}
            >
              {isSubmitting ? "Creating Account…" : "Create Account"}
            </button>

            <p className="text-center text-xs font-semibold leading-5 text-gray-500">
              By creating an account, you agree to the{" "}
              <Link to="/terms" className="font-black text-orange-600 underline underline-offset-4 hover:text-orange-800">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-black text-orange-600 underline underline-offset-4 hover:text-orange-800">
                Privacy Policy
              </Link>
              .
            </p>

            {submitMessage && (
              <p
                className={`rounded-lg border px-3 py-2 text-sm animate-fade-in-up transition-all duration-300 ${
                  submitError
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {submitMessage}
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 transition-colors duration-300 hover:text-gray-700">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="font-semibold text-orange-500 hover:text-orange-400 transition-all duration-300 hover:scale-105 inline-block cursor-pointer"
            >
              Sign in
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
