import CustomSelect from "./CustomSelect.jsx";

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

function sanitizeDaysInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 1);
}

const COMBO_CONTAINER_CLASS =
  "flex rounded-xl border border-gray-300 bg-white shadow-none transition-colors duration-200 focus-within:border-orange-500 focus-within:shadow-none";
const COMBO_INPUT_CLASS =
  "min-w-0 flex-1 border-0 bg-transparent px-4 py-3 outline-none shadow-none focus:ring-0 focus:shadow-none";

export default function DaysToPrepareInput({
  id,
  name,
  value,
  onChange,
  listId = "days-to-prepare-options",
}) {
  const dayOptions = DAY_OPTIONS.map((day) => ({
    value: String(day),
    label: `${day} day${day === 1 ? "" : "s"}`,
  }));
  const selectedDay = DAY_OPTIONS.includes(Number(value)) ? String(value) : "1";

  return (
    <div className={COMBO_CONTAINER_CLASS}>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        list={listId}
        value={value}
        onChange={(event) => onChange(sanitizeDaysInput(event.target.value))}
        placeholder="Days"
        className={COMBO_INPUT_CLASS}
      />
      <div className="border-l border-gray-200">
        <CustomSelect
          ariaLabel={`${name} preset`}
          compact
          value={selectedDay}
          onChange={onChange}
          options={dayOptions}
        />
      </div>
      <datalist id={listId}>
        {DAY_OPTIONS.map((day) => (
          <option key={day} value={day} />
        ))}
      </datalist>
    </div>
  );
}
