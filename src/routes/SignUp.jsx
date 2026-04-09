import { Link } from "react-router-dom";
import { useState } from "react";
import PasswordEye from "../assets/PasswordEye.svg"
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";

export default function SignUp() {
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

  const onSubmit = (e) => {
    e.preventDefault();

    // Show all errors after submit click
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) return;

    // TODO: call your signup API
    console.log("Form is valid:", form);
  };

  return (
      <>
        <SmallNavBar />
        <SideMenu />
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur p-6 sm:p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Join <span className="text-orange-500">3Dprintings.xyz</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Create your account and join the fun.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {/* Username */}
          <div>
            <label className="mb-1 block text-sm text-gray-300">Username</label>
            <div className="relative">
              <input
                name="username"
                type="text"
                value={form.username}
                onChange={onChange}
                onFocus={() => setActiveField("username")}
                onBlur={() => setActiveField(null)}
                placeholder="yourname"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 pr-10 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
              {form.username && isFieldValid("username") && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-400 font-bold">
                  ✓
                </span>
              )}
            </div>
            <p className="mt-1 min-h-[16px] text-xs text-red-400">
              {((activeField === "username") || touched.username) &&
              !isFieldValid("username")
                ? fieldErrors.username
                : ""}
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm text-gray-300">Email</label>
            <div className="relative">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                onFocus={() => setActiveField("email")}
                onBlur={() => setActiveField(null)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 pr-10 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
              {form.email && isFieldValid("email") && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-400 font-bold">
                  ✓
                </span>
              )}
            </div>
            <p className="mt-1 min-h-[16px] text-xs text-red-400">
              {((activeField === "email") || touched.email) && !isFieldValid("email")
                ? fieldErrors.email
                : ""}
            </p>
          </div>

          {/* Password */}
          <div>
  <label className="mb-1 block text-sm text-gray-300">Password</label>
  <div className="relative">
    <input
      name="password"
      type={showPasswords ? "text" : "password"}
      value={form.password}
      onChange={onChange}
      onFocus={() => setActiveField("password")}
      onBlur={() => setActiveField(null)}
      placeholder="At least 8 characters"
      className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 pr-12 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
    />

    <button
      type="button"
      onClick={() => setShowPasswords((prev) => !prev)}
      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
    >
      <img src={PasswordEye} alt="Password visibility changer" className="h-5 w-5" />
    </button>

    {form.password && isFieldValid("password") && (
      <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-green-400 font-bold">
        ✓
      </span>
    )}
  </div>

  <p className="mt-1 text-xs text-red-400">
    {((activeField === "password") || touched.password) && !isFieldValid("password")
      ? fieldErrors.password
      : ""}
  </p>
</div>
          {/* Confirm Password */}
          <div>
            <label className="mb-1 block text-sm text-gray-300">Confirm Password</label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showPasswords ? "text" : "password"}
                value={form.confirmPassword}
                onChange={onChange}
                onFocus={() => setActiveField("confirmPassword")}
                onBlur={() => setActiveField(null)}
                placeholder="Repeat password"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 pr-10 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
              />
              {form.confirmPassword && isFieldValid("confirmPassword") && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-400 font-bold">
                  ✓
                </span>
              )}
            </div>
            <p className="mt-1 min-h-4 text-xs text-red-400">
              {((activeField === "confirmPassword") || touched.confirmPassword) &&
              !isFieldValid("confirmPassword")
                ? fieldErrors.confirmPassword
                : ""}
            </p>
          </div>

          <button
            type="submit"
            disabled={!isFormValid}
            className={` cursor-pointer w-full rounded-xl py-3 font-semibold text-white transition ${
              isFormValid
                ? "bg-orange-500 hover:bg-orange-400 active:scale-[0.99]"
                : "bg-gray-700 cursor-not-allowed opacity-60"
            }`}
          >
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="font-semibold text-orange-500 hover:text-orange-400"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
        </>
  );
}