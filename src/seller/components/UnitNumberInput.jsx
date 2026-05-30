import { ChevronDown } from "lucide-react";

function sanitizeNaturalNumberInput(value) {
  return String(value || "").replace(/\D/g, "");
}

const COMBO_CONTAINER_CLASS =
  "flex overflow-hidden rounded-xl border border-gray-300 bg-white shadow-none transition-colors duration-200 focus-within:border-orange-500 focus-within:shadow-none";
const COMBO_INPUT_CLASS =
  "min-w-0 flex-1 border-0 bg-transparent px-4 py-3 outline-none shadow-none focus:ring-0 focus:shadow-none";
const COMBO_SELECT_CLASS =
  "cursor-pointer appearance-none border-0 bg-transparent py-3 pl-3 pr-9 text-sm font-semibold text-gray-700 outline-none shadow-none focus:ring-0 focus:shadow-none";

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
    <div className={COMBO_CONTAINER_CLASS}>
      <input
        id={id}
        name={name}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onValueChange(sanitizeNaturalNumberInput(event.target.value))}
        placeholder={placeholder}
        className={COMBO_INPUT_CLASS}
      />
      <div className="group/unit relative shrink-0">
        <select
          aria-label={`${name} unit`}
          value={unit}
          onChange={(event) => onUnitChange(event.target.value)}
          className={COMBO_SELECT_CLASS}
        >
          {units.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform duration-300 ease-in-out group-focus-within/unit:rotate-180"
        />
      </div>
    </div>
  );
}
