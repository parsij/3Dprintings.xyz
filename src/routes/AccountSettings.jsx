import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, Routes, Route, Link, useLocation } from "react-router-dom";
import Account from "../components/Account.jsx";
import ChangePassword from "../components/ChangePassword.jsx";
import SideMenu from "../components/SideMenu.jsx";
import ShippingAddress from "../components/ShippingAddress.jsx";
import Orders from "../components/Orders.jsx";
import OrderDetails from "../components/OrderDetails.jsx";
import Navbar from "../components/NavBar.jsx";
import {
  changeAccountPassword,
  getAccountAddress,
  signOutAccount,
  suggestAccountAddress,
  updateAccountAddress,
  updateAccountProfile,
} from "../services/accountSettingsService.js";


const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 100;

export default function AccountSettings({ user, setUser }) {
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({ username: "", email: "", phone_number: "" });
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
      phone_number: user.phone_number || "",
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
    }, ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS);

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
    const street = addressForm.street_address.trim();
    const city = addressForm.city.trim();
    const state = addressForm.state_province.trim().toUpperCase();
    const postal = addressForm.postal_code.trim();
    const cc = addressForm.country_code.trim().toUpperCase();

    if (!street) {
      errors.street_address = "Street address is required.";
    } else {
      if (!/\d/.test(street)) {
        errors.street_address = "Enter a full street address with a house/building number.";
      } else if (street.length > 200) {
        errors.street_address = "Street address is too long.";
      }
    }

    if (!city) {
      errors.city = "City is required.";
    } else if (city.length > 120) {
      errors.city = "City is too long.";
    }

    if (!state) {
      errors.state_province = "State is required.";
    } else if (!/^[A-Z]{2}$/.test(state)) {
      errors.state_province = "State must be a 2-letter US code (e.g., CA).";
    }

    if (!postal) {
      errors.postal_code = "ZIP code is required.";
    } else if (!/^\d{5}(?:-\d{4})?$/.test(postal)) {
      errors.postal_code = "ZIP must be valid (e.g., 94107 or 94107-1234).";
    }

    if (!cc) {
      errors.country_code = "Country code is required.";
    } else if (cc !== "US") {
      errors.country_code = "Only US residential addresses are supported.";
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

  const location = useLocation();

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
        phone_number: profileForm.phone_number,
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
      let toSave = {
        street_address: addressForm.street_address.trim(),
        city: addressForm.city.trim(),
        state_province: addressForm.state_province.trim().toUpperCase(),
        postal_code: addressForm.postal_code.trim(),
        country_code: "US",
      };

      if (!useManualAddress) {
        const q = addressLine.trim();
        if (!q) {
          setAddressError(true);
          setAddressMessage("Enter your address.");
          return;
        }
        const data = await suggestAccountAddress(q, { limit: 1 });
        const top = Array.isArray(data?.suggestions) ? data.suggestions[0] : null;
        if (
          !top?.streetLine ||
          !top?.street ||
          !top?.city ||
          !top?.state ||
          !top?.postcode ||
          !top?.houseNumber
        ) {
          setAddressError(true);
          setAddressMessage(
            "Could not find a full home/apartment address. Add more details or use manual entry."
          );
          return;
        }
        toSave = {
          street_address: top.streetLine.trim(),
          city: top.city || "",
          state_province: top.state.toUpperCase(),
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
      <Navbar isSignedIn={!!user} NoNavBarLimit={false
      } />
      <SideMenu />

      <main className="flex min-h-screen pt-16 bg-gray-50 flex-col md:flex-row text-gray-900">
        <aside className="w-full md:w-64 lg:w-72 border-r border-gray-200 bg-white shrink-0">
          <div className="sticky top-20 p-4 md:pt-8 pt-4">
            <nav className="flex flex-col gap-1">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">Account Settings</h3>

              <Link
                to="/account"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-l-4 ${
                  location.pathname === '/account' || location.pathname === '/account/'
                    ? 'bg-orange-50 border-orange-500 text-orange-800' 
                    : 'border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Profile Info
              </Link>

              <Link
                to="/account/address"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-l-4 ${
                  location.pathname === '/account/address'
                    ? 'bg-orange-50 border-orange-500 text-orange-800'  
                    : 'border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Shipping Address
              </Link>

              <Link
                to="/account/password"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-l-4 ${
                  location.pathname === '/account/password'
                    ? 'bg-orange-50 border-orange-500 text-orange-800'  
                    : 'border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Change Password
              </Link>
            </nav>

            <h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-500">
              Activity
            </h3>

            <nav className="flex flex-col gap-1 pt-2">
              <Link
                to="/account/orders"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-l-4 ${
                  location.pathname === '/account/orders' || location.pathname.startsWith('/account/orders/')
                    ? 'bg-orange-50 border-orange-500 text-orange-800'
                    : 'border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Orders
              </Link>
            </nav>
          </div>
        </aside>

        <div className="flex-1 p-6 md:p-10 lg:p-14 overflow-x-hidden">
          <div className="max-w-4xl">
            <Routes>
              <Route path="/" element={
                <Account
                  profileForm={profileForm}
                  setProfileForm={setProfileForm}
                  profileErrors={profileErrors}
                  canSubmitProfile={canSubmitProfile}
                  isSavingProfile={isSavingProfile}
                  onProfileSubmit={onProfileSubmit}
                  profileMessage={profileMessage}
                  profileError={profileError}
                  onSignOut={onSignOut}
                  isSigningOut={isSigningOut}
                  signOutMessage={signOutMessage}
                />
              } />

              <Route path="address" element={
                <ShippingAddress
                  addressLine={addressLine}
                  setAddressLine={setAddressLine}
                  addressSuggestions={addressSuggestions}
                  showAddressSuggestions={showAddressSuggestions}
                  setShowAddressSuggestions={setShowAddressSuggestions}
                  isSuggestingAddress={isSuggestingAddress}
                  useManualAddress={useManualAddress}
                  setUseManualAddress={setUseManualAddress}
                  addressForm={addressForm}
                  setAddressForm={setAddressForm}
                  addressErrors={addressErrors}
                  canSubmitAddress={canSubmitAddress}
                  isSavingAddress={isSavingAddress}
                  onAddressSubmit={onAddressSubmit}
                  addressMessage={addressMessage}
                  addressError={addressError}
                  setAddressMessage={setAddressMessage}
                  setAddressError={setAddressError}
                />
              } />

              <Route path="password" element={
                <ChangePassword
                  passwordForm={passwordForm}
                  setPasswordForm={setPasswordForm}
                  showPasswords={showPasswords}
                  setShowPasswords={setShowPasswords}
                  passwordErrors={passwordErrors}
                  canSubmitPassword={canSubmitPassword}
                  isSavingPassword={isSavingPassword}
                  onPasswordSubmit={onPasswordSubmit}
                  passwordMessage={passwordMessage}
                  passwordError={passwordError}
                />
              } />

              <Route path="orders" element={
                <Orders user={user} />
              } />

              <Route path="orders/:orderId" element={
                <OrderDetails user={user} />
              } />
            </Routes>
          </div>
        </div>
      </main>
    </>
  );
}
