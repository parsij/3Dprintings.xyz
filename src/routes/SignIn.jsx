import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import PasswordEye from "../assets/PasswordEye.svg";
import googleLogo from "../assets/google.svg";
import SideMenu from "../components/SideMenu.jsx";
import SmallNavBar from "../components/SmallNavBar.jsx";
import axios from "axios";

const GOOGLE_GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const SELLER_SITE_ORIGIN = "https://seller.3dprintings.xyz";

export default function SignIn({ setUser, postLoginSellerFlow = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [activeField, setActiveField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    const message = String(location.state?.message || "").trim();
    if (!message) return;

    setSubmitError(true);
    setSubmitMessage(message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const validators = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    password: (v) => v.length > 0,
  };

  const fieldErrors = {
    email: "Enter a valid email address.",
    password: "Enter your password.",
  };

  const isFieldValid = (name) => validators[name](form[name]);

  const isFormValid = Object.keys(validators).every((name) =>
    validators[name](form[name])
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const redirectAfterAuth = useCallback(
    (signedInUser) => {
      if (!postLoginSellerFlow) {
        navigate("/home", { replace: true });
        return;
      }

      const isSeller = String(signedInUser?.role || "").toLowerCase() === "seller";
      if (isSeller) {
        window.location.replace(SELLER_SITE_ORIGIN);
      } else {
        navigate("/become-seller", { replace: true });
      }
    },
    [navigate, postLoginSellerFlow]
  );

  const onSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      email: true,
      password: true,
    });

    setSubmitMessage("");
    setSubmitError(false);

    if (!isFormValid) return;

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${API_BASE}/api/login`,
        {
          email: form.email,
          password: form.password,
        },
        {
          withCredentials: true,
        }
      );

      setUser(response.data.user);
      setSubmitMessage(response.data?.message || "Authentication successful.");

      setTimeout(() => {
        redirectAfterAuth(response.data.user);
      }, 700);
    } catch (error) {
      const message = error.response?.data?.message || "Signin failed";
      setSubmitError(true);
      setSubmitMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredentialResponse = useCallback(
    async (googleResponse) => {
      const credential = String(googleResponse?.credential || "").trim();
      if (!credential) {
        setSubmitError(true);
        setSubmitMessage("Google sign-in did not return a credential.");
        return;
      }

      try {
        setIsGoogleSubmitting(true);
        setSubmitError(false);
        setSubmitMessage("");

        const response = await axios.post(
          `${API_BASE}/api/auth/google`,
          { credential },
          { withCredentials: true }
        );

        setUser(response.data.user);
        setSubmitError(false);
        setSubmitMessage(response.data?.message || "Signed in with Google.");
        redirectAfterAuth(response.data.user);
      } catch (error) {
        const message = error.response?.data?.message || "Google sign-in failed";
        setSubmitError(true);
        setSubmitMessage(message);
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [API_BASE, redirectAfterAuth, setUser]
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchGoogleConfig() {
      try {
        const response = await axios.get(`${API_BASE}/api/auth/google/config`, {
          withCredentials: true,
        });
        const clientId = String(response.data?.clientId || "").trim();
        if (isMounted) {
          setGoogleClientId(clientId);
        }
      } catch {
        if (isMounted) {
          setGoogleClientId("");
        }
      }
    }

    fetchGoogleConfig();
    return () => {
      isMounted = false;
    };
  }, [API_BASE]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    let scriptNode = null;

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        ux_mode: "popup",
        context: "signin",
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 320,
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector(`script[src="${GOOGLE_GSI_SCRIPT_SRC}"]`);
    if (existingScript) {
      const handleLoad = () => renderGoogleButton();
      const handleError = () => setGoogleReady(false);
      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);

      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };
    }

    scriptNode = document.createElement("script");
    scriptNode.src = GOOGLE_GSI_SCRIPT_SRC;
    scriptNode.async = true;
    scriptNode.defer = true;
    scriptNode.onload = renderGoogleButton;
    scriptNode.onerror = () => setGoogleReady(false);
    document.head.appendChild(scriptNode);

    return () => {
      cancelled = true;
      if (scriptNode) {
        scriptNode.onload = null;
        scriptNode.onerror = null;
      }
    };
  }, [googleClientId, handleGoogleCredentialResponse]);

  return (
    <>
      <SmallNavBar />
      <SideMenu />
      <main className="min-h-screen bg-orange-50 text-gray-900 flex items-center justify-center px-4">
        <section className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 sm:p-8 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] animate-fade-in-up">
          <div className="mb-6 text-center group">
            <h1 className="text-3xl font-extrabold tracking-tight transition-all duration-300 group-hover:translate-y-[-2px]">
              Welcome back to{" "}
              <span className="text-orange-500 group-hover:text-orange-600 transition-colors duration-300">
                3Dprintings.xyz
              </span>
            </h1>
            <p className="mt-2 text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
              Sign in to continue shopping 3D printed models.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
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
                  placeholder="email"
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
              <p className={`mt-1 min-h-[16px] text-xs transition-all duration-300 ${((activeField === "email") || touched.email) && !isFieldValid("email") ? "text-red-500" : "text-red-400"}`}>
                {((activeField === "email") || touched.email) &&
                !isFieldValid("email")
                  ? fieldErrors.email
                  : ""}
              </p>
            </div>

            <div className="group transition-all duration-300 hover:translate-x-1">
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm text-gray-700 font-semibold group-hover:text-orange-600 transition-colors duration-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="cursor-pointer text-xs text-gray-500 hover:text-orange-500 transition-all duration-300 hover:scale-105"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={onChange}
                  onFocus={() => setActiveField("password")}
                  onBlur={() => setActiveField(null)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 focus:shadow-lg hover:border-orange-200 cursor-pointer"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 active:scale-95 opacity-70 hover:opacity-100"
                >
                  <img
                    src={PasswordEye}
                    alt="Password visibility changer"
                    className="h-5 w-5"
                  />
                </button>
              </div>

              <p className={`mt-1 min-h-[16px] text-xs transition-all duration-300 ${((activeField === "password") || touched.password) && !isFieldValid("password") ? "text-red-500" : "text-red-400"}`}>
                {((activeField === "password") || touched.password) &&
                !isFieldValid("password")
                  ? fieldErrors.password
                  : ""}
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
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>

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

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-500">OR</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {!googleClientId ? (
            <div className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center justify-center gap-2 text-center text-sm text-gray-500">
                <img src={googleLogo} alt="Google" className="h-4 w-4" />
                <span>Google sign-in is not available.</span>
              </div>
            </div>
          ) : (
            <div
              ref={googleButtonRef}
              className={`${isGoogleSubmitting ? "pointer-events-none opacity-70" : ""} flex min-h-[44px] w-full items-center justify-center`}
            />
          )}
          {googleClientId && !googleReady && (
            <p className="mt-2 text-center text-xs text-gray-500">Loading Google sign-in...</p>
          )}

          <p className="mt-6 text-center text-sm text-gray-600 transition-colors duration-300 hover:text-gray-700">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-orange-500 hover:text-orange-400 transition-all duration-300 hover:scale-105 inline-block cursor-pointer"
            >
              Sign up
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
