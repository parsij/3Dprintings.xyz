import PasswordEye from "../assets/PasswordEye.svg";

export default function ChangePassword({
  passwordForm,
  setPasswordForm,
  showPasswords,
  setShowPasswords,
  passwordErrors,
  canSubmitPassword,
  isSavingPassword,
  onPasswordSubmit,
  passwordMessage,
  passwordError,
}) {
  return (
    <article
      className="animate-fade-in-up rounded-2xl border border-orange-100 bg-white p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl sm:p-8"
      style={{ animationDelay: "0.15s" }}
    >
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
              <img
                src={PasswordEye}
                alt="Toggle password visibility"
                className="h-5 w-5 hover:opacity-70 transition-opacity"
              />
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
              <img
                src={PasswordEye}
                alt="Toggle password visibility"
                className="h-5 w-5 hover:opacity-70 transition-opacity"
              />
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
              <img
                src={PasswordEye}
                alt="Toggle password visibility"
                className="h-5 w-5 hover:opacity-70 transition-opacity"
              />
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
  );
}