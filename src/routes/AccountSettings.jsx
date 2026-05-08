import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Account from "../components/Account.jsx";
import ChnagePassword from "../components/ChnagePassword.jsx";
import SmallNavBar from "../components/SmallNavBar.jsx";
import SideMenu from "../components/SideMenu.jsx";
import ShippingAddress from "../components/ShippingAddress.jsx";
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
      <SmallNavBar />
      <SideMenu />

      <main className="min-h-screen overflow-x-hidden bg-orange-50 px-4 pb-12 pt-24 text-gray-900">
        <section className="mx-auto grid w-full max-w-5xl gap-5 px-1 lg:grid-cols-2">
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

          <ChnagePassword
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
        </section>
      </main>
    </>
  );
}
