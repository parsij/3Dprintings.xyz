import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import {
  changeAccountPassword,
  signOutAccount,
  updateAccountProfile,
} from "../services/accountSettingsService.js";
import PasswordEye from "../assets/PasswordEye.svg";

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function AccountSettings({ user, setUser }) {
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({ username: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [signOutMessage, setSignOutMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      username: user.username || "",
      email: user.email || "",
    });
  }, [user]);

  const profileErrors = useMemo(() => {
    const errors = {};

    if (profileForm.username.trim().length < 3) {
      errors.username = "Username must be at least 3 characters.";
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim().toLowerCase());
    if (!emailOk) {
      errors.email = "Enter a valid email address.";
    }

    return errors;
  }, [profileForm]);

  const passwordErrors = useMemo(() => {
    const errors = {};

    if (!passwordForm.oldPassword) {
      errors.oldPassword = "Enter your current password.";
    }

    if (!passwordRule.test(passwordForm.newPassword)) {
      errors.newPassword =
        "New password must be 8+ chars with uppercase, lowercase, and a number.";
    }

    if (passwordForm.confirmNewPassword !== passwordForm.newPassword) {
      errors.confirmNewPassword = "New passwords do not match.";
    }

    if (passwordForm.oldPassword && passwordForm.oldPassword === passwordForm.newPassword) {
      errors.newPassword = "New password must be different from current password.";
    }

    return errors;
  }, [passwordForm]);

  const canSubmitProfile = Object.keys(profileErrors).length === 0;
  const canSubmitPassword = Object.keys(passwordErrors).length === 0;

  async function onProfileSubmit(event) {
    event.preventDefault();

    setProfileMessage("");
    setProfileError(false);

    if (!canSubmitProfile) {
      setProfileError(true);
      setProfileMessage("Please fix the profile fields and try again.");
      return;
    }

    try {
      setIsSavingProfile(true);

      const data = await updateAccountProfile({
        username: profileForm.username,
        email: profileForm.email,
      });

      if (data?.user) {
        setUser(data.user);
      }

      setProfileError(false);
      setProfileMessage(data?.message || "Profile updated successfully.");
    } catch (error) {
      setProfileError(true);
      setProfileMessage(error.message || "Profile update failed.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function onPasswordSubmit(event) {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError(false);

    if (!canSubmitPassword) {
      setPasswordError(true);
      setPasswordMessage("Please fix the password fields and try again.");
      return;
    }

    try {
      setIsSavingPassword(true);

      const data = await changeAccountPassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });

      setPasswordError(false);
      setPasswordMessage(data?.message || "Password changed successfully.");
    } catch (error) {
      setPasswordError(true);
      setPasswordMessage(error.message || "Password update failed.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function onSignOut() {
    setSignOutMessage("");

    try {
      setIsSigningOut(true);
      await signOutAccount();
      navigate("/home", { replace: true });
      setUser(null);
    } catch (error) {
      setSignOutMessage(error.message || "Sign out failed.");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <>
      <SmallNavBar />
      <SideMenu />

      <main className="min-h-screen bg-orange-50 px-4 pb-12 pt-24 text-gray-900">
        <section className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-2">
          <article className="animate-fade-in-up rounded-2xl border border-orange-100 bg-white p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 sm:p-8">
            <h1 className="text-3xl font-extrabold tracking-tight hover:text-orange-600 transition-colors duration-300">
              Account <span className="text-orange-500">settings</span>
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Update your username and email used for your marketplace account.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onProfileSubmit} noValidate>
              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label htmlFor="username" className="mb-1 block text-sm text-gray-700 font-semibold">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={profileForm.username}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                  placeholder="yourname"
                />
                {profileErrors.username && (
                  <p className="mt-1 text-xs text-red-500 animate-pulse">{profileErrors.username}</p>
                )}
              </div>

              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label htmlFor="email" className="mb-1 block text-sm text-gray-700 font-semibold">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                  placeholder="you@example.com"
                />
                {profileErrors.email && (
                  <p className="mt-1 text-xs text-red-500 animate-pulse">{profileErrors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmitProfile || isSavingProfile}
                className={`w-full cursor-pointer rounded-xl py-3 font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:scale-100 ${
                  canSubmitProfile && !isSavingProfile
                    ? "bg-orange-500 hover:bg-orange-400 shadow-md hover:shadow-lg"
                    : "cursor-not-allowed bg-gray-300 opacity-50"
                }`}
              >
                {isSavingProfile ? (
                  <span className="inline-flex items-center">
                    <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Saving profile...
                  </span>
                ) : (
                  "Save profile"
                )}
              </button>

              {profileMessage && (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm animate-fade-in-up transition-all duration-300 ${
                    profileError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  {profileMessage}
                </p>
              )}

              <div className="border-t border-orange-100 pt-4 mt-4 hover:border-orange-300 transition-colors duration-300">
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={isSigningOut}
                  className={`w-full cursor-pointer rounded-xl py-3 font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:scale-100 ${
                    !isSigningOut
                      ? "bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg"
                      : "cursor-not-allowed bg-gray-400 opacity-50"
                  }`}
                >
                  {isSigningOut ? (
                    <span className="inline-flex items-center">
                      <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                      Signing out...
                    </span>
                  ) : (
                    "Sign out"
                  )}
                </button>
                {signOutMessage && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 animate-fade-in-up">
                    {signOutMessage}
                  </p>
                )}
              </div>
            </form>
          </article>

          <article className="animate-fade-in-up rounded-2xl border border-orange-100 bg-white p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 sm:p-8" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-2xl font-extrabold tracking-tight hover:text-orange-600 transition-colors duration-300">
              Change <span className="text-orange-500">password</span>
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              For security, enter your current password before setting a new one.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onPasswordSubmit} noValidate>
              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label htmlFor="oldPassword" className="mb-1 block text-sm text-gray-700 font-semibold">
                  Current password
                </label>
                <div className="relative">
                  <input
                    id="oldPassword"
                    name="oldPassword"
                    type={showPasswords.oldPassword ? "text" : "password"}
                    value={passwordForm.oldPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, oldPassword: !prev.oldPassword }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200"
                  >
                    <img src={PasswordEye} alt="Toggle password visibility" className="h-5 w-5 hover:opacity-70 transition-opacity" />
                  </button>
                </div>
                {passwordErrors.oldPassword && (
                  <p className="mt-1 text-xs text-red-500 animate-pulse">{passwordErrors.oldPassword}</p>
                )}
              </div>

              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label htmlFor="newPassword" className="mb-1 block text-sm text-gray-700 font-semibold">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPasswords.newPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, newPassword: !prev.newPassword }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200"
                  >
                    <img src={PasswordEye} alt="Toggle password visibility" className="h-5 w-5 hover:opacity-70 transition-opacity" />
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-500 animate-pulse">{passwordErrors.newPassword}</p>
                )}
              </div>

              <div className="transform transition-all duration-300 hover:translate-x-1">
                <label htmlFor="confirmNewPassword" className="mb-1 block text-sm text-gray-700 font-semibold">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type={showPasswords.confirmNewPassword ? "text" : "password"}
                    value={passwordForm.confirmNewPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                    placeholder="Repeat your new password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, confirmNewPassword: !prev.confirmNewPassword }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200"
                  >
                    <img src={PasswordEye} alt="Toggle password visibility" className="h-5 w-5 hover:opacity-70 transition-opacity" />
                  </button>
                </div>
                {passwordErrors.confirmNewPassword && (
                  <p className="mt-1 text-xs text-red-500 animate-pulse">{passwordErrors.confirmNewPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmitPassword || isSavingPassword}
                className={`w-full cursor-pointer rounded-xl py-3 font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:scale-100 ${
                  canSubmitPassword && !isSavingPassword
                    ? "bg-orange-500 hover:bg-orange-400 shadow-md hover:shadow-lg"
                    : "cursor-not-allowed bg-gray-300 opacity-50"
                }`}
              >
                {isSavingPassword ? (
                  <span className="inline-flex items-center">
                    <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Updating password...
                  </span>
                ) : (
                  "Update password"
                )}
              </button>

              {passwordMessage && (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm animate-fade-in-up transition-all duration-300 ${
                    passwordError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  {passwordMessage}
                </p>
              )}
            </form>
          </article>
        </section>
      </main>
    </>
  );
}
