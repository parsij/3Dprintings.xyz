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

export default function ShippingAddress({
  addressLine,
  setAddressLine,
  addressSuggestions,
  showAddressSuggestions,
  setShowAddressSuggestions,
  isSuggestingAddress,
  useManualAddress,
  setUseManualAddress,
  addressForm,
  setAddressForm,
  addressErrors,
  canSubmitAddress,
  isSavingAddress,
  onAddressSubmit,
  addressMessage,
  addressError,
  setAddressMessage,
  setAddressError,
}) {
  const showSuggestionDropdown = showAddressSuggestions && (isSuggestingAddress || addressSuggestions.length > 0);

  return (
    <article
      className="animate-fade-in-up rounded-2xl border border-orange-100 bg-white p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl sm:p-8"
      style={{ animationDelay: "0.1s" }}
    >
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
      <p className="mt-2 text-sm text-gray-600">This is used for tax calculation and checkout.</p>

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

              {showSuggestionDropdown && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-orange-100 bg-white shadow-xl">
                  <ul className="hide-scrollbar max-h-60 overflow-auto py-1">
                    {isSuggestingAddress
                      ? Array.from({ length: 5 }).map((_, idx) => (
                          <li key={`address-skeleton-${idx}`} className="px-4 py-2">
                            <div className="h-4 w-full animate-pulse rounded bg-orange-100/70" />
                          </li>
                        ))
                      : addressSuggestions.map((s, idx) => (
                          <li key={`${s.displayAddress}-${idx}`}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setAddressLine(s.displayAddress || "");
                                setAddressForm((prev) => ({
                                  ...prev,
                                  street_address: (s.streetLine || `${s.houseNumber ? `${s.houseNumber} ` : ""}${s.street || ""}`).trim(),
                                  city: s.city || "",
                                  state_province: (s.state || "").toUpperCase(),
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
            setAddressForm((prev) => ({ ...prev, country_code: "US" }));
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
                value={addressForm.country_code || "US"}
                readOnly
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 hover:border-orange-200 shadow-sm focus:shadow-md"
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
  );
}