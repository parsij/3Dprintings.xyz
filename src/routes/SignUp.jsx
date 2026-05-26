import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import PasswordEye from "../assets/PasswordEye.svg"
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

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
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) return;

    try {
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

      setUser(response.data.user); // auto log in
      navigate("/home", { replace: true });
    } catch (error) {
      console.log(error.response?.data?.message || "Signup failed");
    }
  };

  return (
    <>
      <SmallNavBar />
      <SideMenu />
      <main className="min-h-screen bg-orange-50 text-gray-900 flex items-center justify-center px-4">
        <section className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 sm:p-8 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] animate-fade-in-up">
          <div className="mb-6 text-center group">
            <h1 className="text-3xl font-extrabold tracking-tight transition-all duration-300 group-hover:translate-y-[-2px]">
              Join{" "}
              <span className="text-orange-500 group-hover:text-orange-600 transition-colors duration-300">
                3Dprintings.xyz
              </span>
            </h1>
            <p className="mt-2 text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
              Create your account and join the fun.
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
              <p className={`mt-1 min-h-4 text-xs transition-all duration-300 ${((activeField === "username") || touched.username) && !isFieldValid("username") ? "text-red-500" : "text-red-400"}`}>
                {((activeField === "username") || touched.username) &&
                !isFieldValid("username")
                  ? fieldErrors.username
                  : ""}
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
              <p className={`mt-1 min-h-[16px] text-xs transition-all duration-300 ${((activeField === "email") || touched.email) && !isFieldValid("email") ? "text-red-500" : "text-red-400"}`}>
                {((activeField === "email") || touched.email) && !isFieldValid("email")
                  ? fieldErrors.email
                  : ""}
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
              <p className={`mt-1 text-xs transition-all duration-300 ${((activeField === "password") || touched.password) && !isFieldValid("password") ? "text-red-500" : "text-red-400"}`}>
                {((activeField === "password") || touched.password) && !isFieldValid("password")
                  ? fieldErrors.password
                  : ""}
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
              <p className={`mt-1 min-h-4 text-xs transition-all duration-300 ${((activeField === "confirmPassword") || touched.confirmPassword) && !isFieldValid("confirmPassword") ? "text-red-500" : "text-red-400"}`}>
                {((activeField === "confirmPassword") || touched.confirmPassword) &&
                !isFieldValid("confirmPassword")
                  ? fieldErrors.confirmPassword
                  : ""}
              </p>
            </div>

            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full rounded-xl py-3 font-semibold text-white transition-all duration-300 ${
                isFormValid
                  ? "cursor-pointer bg-orange-500 hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                  : "bg-gray-300 cursor-not-allowed opacity-70"
              }`}
            >
              Create Account
            </button>
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
