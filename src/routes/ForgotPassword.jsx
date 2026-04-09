import { Link } from "react-router-dom";
import { useState } from "react";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [activeField, setActiveField] = useState(null);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const onSubmit = (e) => {
    e.preventDefault();
    setTouched(true);

    if (!isEmailValid) return;

    // TODO: call your forgot-password API
    // await api.forgotPassword({ email });
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <SmallNavBar />
      <SideMenu />
      <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur p-6 sm:p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Reset your <span className="text-orange-500">password</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Enter your email and we’ll send you a reset link.
          </p>
        </div>

        {!submitted ? (
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Email</label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => setActiveField(null)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 pr-10 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                />
                {email && isEmailValid && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-400 font-bold">
                    ✓
                  </span>
                )}
              </div>

              {/* reserved space so no layout jump */}
              <p className="mt-1 min-h-[16px] text-xs text-red-400">
                {((activeField === "email") || touched) && !isEmailValid
                  ? "Enter a valid email address."
                  : ""}
              </p>
            </div>

            <button
              type="submit"
              disabled={!isEmailValid}
              className={`w-full rounded-xl py-3 font-semibold text-white transition ${
                isEmailValid
                  ? "cursor-pointer bg-orange-500 hover:bg-orange-400 active:scale-[0.99]"
                  : "bg-gray-700 cursor-not-allowed opacity-60"
              }`}
            >
              Send reset link
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-gray-700 bg-gray-950 p-4 text-sm text-gray-300">
            If an account exists for{" "}
            <span className="font-semibold text-white">{email}</span>, a password
            reset link has been sent.
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          Remembered your password?{" "}
          <Link
            to="/signin"
            className="font-semibold text-orange-500 hover:text-orange-400"
          >
            Back to Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}