import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import {
  changeAccountPassword,
  getAccountAddress,
  signOutAccount,
  suggestAccountAddress,
  updateAccountAddress,
  updateAccountProfile,
} from "../services/accountSettingsService.js";
import PasswordEye from "../assets/PasswordEye.svg";

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const usStates = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export default function AccountSettings({ user, setUser }) {
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({ username: "", email: "" });
  const [addressForm, setAddressForm] = useState({
    street_address: "",
    city: "",
    state_province: "",
    postal_code: "",
    country_code: "",
  });
  const [addressLine, setAddressLine] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSuggestingAddress, setIsSuggestingAddress] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [useManualAddress, setUseManualAddress] = useState(false);
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
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [addressError, setAddressError] = useState(false);
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

  useEffect(() => {
    if (!user) return;

    let isCancelled = false;
    (async () => {
      try {
        const data = await getAccountAddress();
        if (isCancelled) return;
        const addr = data?.address || {};
        setAddressForm({
          street_address: addr.street_address || "",
          city: addr.city || "",
          state_province: addr.state_province || "",
          postal_code: addr.postal_code || "",
          country_code: addr.country_code || "",
        });
        const formattedLine = [
          addr.street_address,
          addr.city,
          addr.state_province,
          addr.postal_code,
          addr.country_code,
        ]
          .filter(Boolean)
          .join(", ");
        setAddressLine(formattedLine);
      } catch (error) {
        if (isCancelled) return;
        setAddressError(true);
        setAddressMessage(error.message || "Could not load address.");
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (useManualAddress) return;

    const q = addressLine.trim();
    if (q.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setIsSuggestingAddress(true);
        const data = await suggestAccountAddress(q, { limit: 6, signal: controller.signal });
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(true);
      } catch {
        if (controller.signal.aborted) return;
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggestingAddress(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [addressLine, user, useManualAddress]);

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

  const addressErrors = useMemo(() => {
    const errors = {};
    const cc = addressForm.country_code.trim();
    if (cc && !/^[A-Za-z]{2}$/.test(cc)) {
      errors.country_code = "Country code must be 2 letters (e.g., US).";
    }
    if (addressForm.street_address.length > 200) {
      errors.street_address = "Street address is too long.";
    }
    if (addressForm.city.length > 120) {
      errors.city = "City is too long.";
    }
    if (addressForm.state_province.length > 120) {
      errors.state_province = "State/Province is too long.";
    }
    if (addressForm.postal_code.length > 30) {
      errors.postal_code = "Postal code is too long.";
    }
    return errors;
  }, [addressForm]);

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
  const canSubmitAddress = Object.keys(addressErrors).length === 0;
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

  async function onAddressSubmit(event) {
    event.preventDefault();

    setAddressMessage("");
    setAddressError(false);

    if (!canSubmitAddress) {
      setAddressError(true);
      setAddressMessage("Please fix the address fields and try again.");
      return;
    }

    try {
      setIsSavingAddress(true);
      let toSave = { ...addressForm };

      if (!useManualAddress) {
        const q = addressLine.trim();
        if (!q) {
          setAddressError(true);
          setAddressMessage("Enter your address.");
          return;
        }
        const data = await suggestAccountAddress(q, { limit: 1 });
        const top = Array.isArray(data?.suggestions) ? data.suggestions[0] : null;
        if (!top?.street) {
          setAddressError(true);
          setAddressMessage("Could not find a matching address. Try typing more details or use manual entry.");
          return;
        }
        toSave = {
          street_address: `${top.houseNumber ? `${top.houseNumber} ` : ""}${top.street || ""}`.trim(),
          city: top.city || "",
          state_province: top.state || "",
          postal_code: top.postcode || "",
          country_code: "US",
        };
        setAddressForm(toSave);
        setAddressLine(top.displayAddress || q);
      }

      const data = await updateAccountAddress(toSave);

      const addr = data?.address || {};
      setAddressForm({
        street_address: addr.street_address || "",
        city: addr.city || "",
        state_province: addr.state_province || "",
        postal_code: addr.postal_code || "",
        country_code: addr.country_code || "",
      });

      setAddressError(false);
      setAddressMessage(data?.message || "Address updated.");
    } catch (error) {
      setAddressError(true);
      setAddressMessage(error.message || "Address update failed.");
    } finally {
      setIsSavingAddress(false);
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
          <h1 className="text-3xl font-extrabold tracking-tight overflow-visible pb-2">
            {['A', 'c', 'c', 'o', 'u', 'n', 't', ' '].map((char, idx) => (
              <span key={`account-${idx}`} className="wave-char" style={{animationDelay: `${idx * 0.1}s`}}>
                {char}
              </span>
            ))}
            <span className="text-orange-500">
              {['s', 'e', 't', 't', 'i', 'n', 'g', 's'].map((char, idx) => (
                <span key={`settings-${idx}`} className="wave-char" style={{animationDelay: `${(idx + 8) * 0.1}s`}}>
                  {char}
                </span>
              ))}
            </span>
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
            <h2 className="text-2xl font-extrabold tracking-tight overflow-visible pb-2">
              {["S", "h", "i", "p", "p", "i", "n", "g", " "].map((char, idx) => (
                <span key={`shipping-${idx}`} className="wave-char" style={{ animationDelay: `${idx * 0.1}s` }}>
                  {char}
                </span>
              ))}
              <span className="text-orange-500">
                {["a", "d", "d", "r", "e", "s", "s"].map((char, idx) => (
                  <span key={`address-${idx}`} className="wave-char" style={{ animationDelay: `${(idx + 9) * 0.1}s` }}>
                    {char}
                  </span>
                ))}
              </span>
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This is used for tax calculation and checkout.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onAddressSubmit} noValidate>
              {!useManualAddress && (
                <div className="transform transition-all duration-300 hover:translate-x-1">
                  <label htmlFor="address_line" className="mb-1 block text-sm text-gray-700 font-semibold">
                    Address
                  </label>
                  <div className="relative">
                    <input
                      id="address_line"
                      name="address_line"
                      type="text"
                      autoComplete="off"
                      value={addressLine}
                      onChange={(event) => {
                        setAddressLine(event.target.value);
                        setShowAddressSuggestions(true);
                      }}
                      onFocus={() => {
                        if (addressSuggestions.length) setShowAddressSuggestions(true);
                      }}
                      onBlur={() => {
                        window.setTimeout(() => setShowAddressSuggestions(false), 150);
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                      placeholder="Start typing your street address..."
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {isSuggestingAddress ? "..." : ""}
                    </div>

                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-orange-100 bg-white shadow-xl">
                        <ul className="max-h-60 overflow-auto py-1">
                          {addressSuggestions.map((s, idx) => (
                            <li key={`${s.displayAddress}-${idx}`}>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setAddressLine(s.displayAddress || "");
                                  setAddressForm((prev) => ({
                                    ...prev,
                                    street_address: `${s.houseNumber ? `${s.houseNumber} ` : ""}${s.street || ""}`.trim(),
                                    city: s.city || "",
                                    state_province: s.state || "",
                                    postal_code: s.postcode || "",
                                    country_code: "US",
                                  }));
                                  setShowAddressSuggestions(false);
                                  setAddressMessage("");
                                  setAddressError(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-orange-50"
                              >
                                {s.displayAddress}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setUseManualAddress((v) => !v);
                  setShowAddressSuggestions(false);
                }}
                className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition-all duration-300 hover:bg-orange-100 hover:border-orange-300"
              >
                {useManualAddress ? "Use one-line autocomplete" : "Type manually"}
              </button>

              {useManualAddress && (
                <>
                  <div className="transform transition-all duration-300 hover:translate-x-1">
                    <label htmlFor="street_address" className="mb-1 block text-sm text-gray-700 font-semibold">
                      Street address
                    </label>
                    <input
                      id="street_address"
                      name="street_address"
                      type="text"
                      value={addressForm.street_address}
                      onChange={(event) =>
                        setAddressForm((prev) => ({ ...prev, street_address: event.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                      placeholder="123 Main St Apt 4B"
                    />
                    {addressErrors.street_address && (
                      <p className="mt-1 text-xs text-red-500 animate-pulse">{addressErrors.street_address}</p>
                    )}
                  </div>

                  <div className="transform transition-all duration-300 hover:translate-x-1">
                    <label htmlFor="city" className="mb-1 block text-sm text-gray-700 font-semibold">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={addressForm.city}
                      onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                      placeholder="San Francisco"
                    />
                    {addressErrors.city && (
                      <p className="mt-1 text-xs text-red-500 animate-pulse">{addressErrors.city}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="transform transition-all duration-300 hover:translate-x-1">
                      <label htmlFor="state_province" className="mb-1 block text-sm text-gray-700 font-semibold">
                        State / Province
                      </label>
                      <select
                        id="state_province"
                        name="state_province"
                        value={addressForm.state_province}
                        onChange={(event) =>
                          setAddressForm((prev) => ({ ...prev, state_province: event.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                      >
                        <option value="">Select a state</option>
                        {usStates.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                      {addressErrors.state_province && (
                        <p className="mt-1 text-xs text-red-500 animate-pulse">{addressErrors.state_province}</p>
                      )}
                    </div>

                    <div className="transform transition-all duration-300 hover:translate-x-1">
                      <label htmlFor="postal_code" className="mb-1 block text-sm text-gray-700 font-semibold">
                        Postal code
                      </label>
                      <input
                        id="postal_code"
                        name="postal_code"
                        type="text"
                        value={addressForm.postal_code}
                        onChange={(event) =>
                          setAddressForm((prev) => ({ ...prev, postal_code: event.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                        placeholder="94107"
                      />
                      {addressErrors.postal_code && (
                        <p className="mt-1 text-xs text-red-500 animate-pulse">{addressErrors.postal_code}</p>
                      )}
                    </div>
                  </div>

                  <div className="transform transition-all duration-300 hover:translate-x-1">
                    <label htmlFor="country_code" className="mb-1 block text-sm text-gray-700 font-semibold">
                      Country code
                    </label>
                    <input
                      id="country_code"
                      name="country_code"
                      type="text"
                      value={addressForm.country_code}
                      onChange={(event) =>
                        setAddressForm((prev) => ({ ...prev, country_code: event.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
                      placeholder="US"
                    />
                    {addressErrors.country_code && (
                      <p className="mt-1 text-xs text-red-500 animate-pulse">{addressErrors.country_code}</p>
                    )}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={!canSubmitAddress || isSavingAddress}
                className={`w-full cursor-pointer rounded-xl py-3 font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:scale-100 ${
                  canSubmitAddress && !isSavingAddress
                    ? "bg-orange-500 hover:bg-orange-400 shadow-md hover:shadow-lg"
                    : "cursor-not-allowed bg-gray-300 opacity-50"
                }`}
              >
                {isSavingAddress ? (
                  <span className="inline-flex items-center">
                    <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Saving address...
                  </span>
                ) : (
                  "Save address"
                )}
              </button>

              {addressMessage && (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm animate-fade-in-up transition-all duration-300 ${
                    addressError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  {addressMessage}
                </p>
              )}
            </form>
          </article>

          <article className="animate-fade-in-up rounded-2xl border border-orange-100 bg-white p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 sm:p-8 lg:col-span-2" style={{ animationDelay: "0.15s" }}>
            <h2 className="text-2xl font-extrabold tracking-tight overflow-visible pb-2">
              {["C", "h", "a", "n", "g", "e", " "].map((char, idx) => (
                <span key={`change-${idx}`} className="wave-char" style={{ animationDelay: `${idx * 0.1}s` }}>
                  {char}
                </span>
              ))}
              <span className="text-orange-500">
                {["p", "a", "s", "s", "w", "o", "r", "d"].map((char, idx) => (
                  <span key={`password-${idx}`} className="wave-char" style={{ animationDelay: `${(idx + 7) * 0.1}s` }}>
                    {char}
                  </span>
                ))}
              </span>
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
