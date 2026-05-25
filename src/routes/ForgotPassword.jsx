import { Link } from "react-router-dom";
import { useState } from "react";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [activeField, setActiveField] = useState(null);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setSubmitMessage("");
    setSubmitError(false);

    if (!isEmailValid) return;

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${API_BASE}/api/password-reset/request`,
        { email },
        { withCredentials: true }
      );
      setSubmitMessage(response.data?.message || "If an account exists for that email, a reset link has been sent.");
      setSubmitted(true);
    } catch (error) {
      setSubmitError(true);
      setSubmitMessage(
        error.response?.data?.message || "Could not send a reset link right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-orange-50 text-gray-900 flex items-center justify-center px-4">
      <SmallNavBar />
      <SideMenu />
      <section className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 sm:p-8 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] animate-fade-in-up">
        <div className="mb-6 text-center group">
          <h1 className="text-3xl font-extrabold tracking-tight transition-all duration-300 group-hover:translate-y-[-2px]">
            Reset your{" "}
            <span className="text-orange-500 group-hover:text-orange-600 transition-colors duration-300">
              password
            </span>
          </h1>
          <p className="mt-2 text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {!submitted ? (
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="group transition-all duration-300 hover:translate-x-1">
              <label className="mb-1 block text-sm text-gray-700 font-semibold group-hover:text-orange-600 transition-colors duration-300">
                Email
              </label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField(null)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
                />
                {email && isEmailValid && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-lg no-bounce">
                    ✓
                  </span>
                )}
              </div>

              {/* reserved space so no layout jump */}
              <p
                className={`mt-1 min-h-[16px] text-xs transition-all duration-300 ${
                  (activeField === "email") || touched
                    ? "text-red-500"
                    : "text-red-400"
                }`}
              >
                {((activeField === "email") || touched) && !isEmailValid
                  ? "Enter a valid email address."
                  : ""}
              </p>
            </div>

            <button
              type="submit"
              disabled={!isEmailValid || isSubmitting}
              className={`w-full rounded-xl py-3 font-semibold text-white transition-all duration-300 ${
                isEmailValid && !isSubmitting
                  ? "cursor-pointer bg-orange-500 hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                  : "bg-gray-300 cursor-not-allowed opacity-70"
              }`}
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>

            {submitMessage && (
              <p className={`text-sm ${submitError ? "text-red-600" : "text-gray-700"}`}>
                {submitMessage}
              </p>
            )}
          </form>
        ) : (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-gray-700 animate-fade-in-up shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            If an account exists for{" "}
            <span className="font-semibold text-gray-900 text-orange-600">
              {email}
            </span>
            , a password reset link has been sent.
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-600 transition-colors duration-300 hover:text-gray-700">
          Remembered your password?{" "}
          <Link
            to="/signin"
            className="font-semibold text-orange-500 hover:text-orange-400 transition-all duration-300 hover:scale-105 inline-block cursor-pointer"
          >
            Back to Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
