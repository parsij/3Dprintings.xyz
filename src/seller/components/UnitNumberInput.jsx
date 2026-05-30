function sanitizeNaturalNumberInput(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function UnitNumberInput({
  id,
  name,
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
  placeholder,
  inputMode = "numeric",
  autoComplete = "off",
}) {
  return (
    <div className="flex">
      <input
        id={id}
        name={name}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onValueChange(sanitizeNaturalNumberInput(event.target.value))}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-l-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
      />
      <select
        aria-label={`${name} unit`}
        value={unit}
        onChange={(event) => onUnitChange(event.target.value)}
        className="rounded-r-xl border border-l-0 border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
      >
        {units.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
