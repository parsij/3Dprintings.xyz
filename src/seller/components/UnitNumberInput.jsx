import CustomSelect from "./CustomSelect.jsx";

function sanitizeNaturalNumberInput(value) {
  return String(value || "").replace(/\D/g, "");
}

const COMBO_CONTAINER_CLASS =
  "flex rounded-xl border border-gray-300 bg-white shadow-none transition-colors duration-200 focus-within:border-orange-500 focus-within:shadow-none";
const COMBO_INPUT_CLASS =
  "min-w-0 flex-1 border-0 bg-transparent px-4 py-3 outline-none shadow-none focus:ring-0 focus:shadow-none";

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
      <div className="border-l border-gray-200">
        <CustomSelect
          ariaLabel={`${name} unit`}
          compact
          value={unit}
          onChange={onUnitChange}
          options={units}
        />
      </div>
    </div>
  );
}
