export default function Account({
  profileForm,
  setProfileForm,
  profileErrors,
  canSubmitProfile,
  isSavingProfile,
  onProfileSubmit,
  profileMessage,
  profileError,
  onSignOut,
  isSigningOut,
  signOutMessage,
}) {
  return (
    <article className="animate-fade-in-up rounded-2xl border border-orange-100 bg-white p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl sm:p-8">
      <h1 className="text-3xl font-extrabold tracking-tight overflow-visible pb-2">
        {["A", "c", "c", "o", "u", "n", "t", " "].map((char, idx) => (
          <span key={`account-${idx}`} className="wave-char" style={{ animationDelay: `${idx * 0.1}s` }}>
            {char}
          </span>
        ))}
        <span className="text-orange-500">
          {["s", "e", "t", "t", "i", "n", "g", "s"].map((char, idx) => (
            <span key={`settings-${idx}`} className="wave-char" style={{ animationDelay: `${(idx + 8) * 0.1}s` }}>
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

         <div className="transform transition-all duration-300 hover:translate-x-1">
           <label htmlFor="phone" className="mb-1 block text-sm text-gray-700 font-semibold">
             Phone Number (Optional)
           </label>
           <input
             id="phone"
             name="phone"
             type="tel"
             value={profileForm.phone_number || ""}
             onChange={(event) =>
               setProfileForm((prev) => ({ ...prev, phone_number: event.target.value }))
             }
             className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
             placeholder="+1 (555) 123-4567"
           />
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
  );
}