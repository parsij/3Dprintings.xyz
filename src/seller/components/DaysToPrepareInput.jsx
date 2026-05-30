import { ChevronDown } from "lucide-react";

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

function sanitizeDaysInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 1);
}

const COMBO_CONTAINER_CLASS =
  "flex overflow-hidden rounded-xl border border-gray-300 bg-white shadow-none transition-colors duration-200 focus-within:border-orange-500 focus-within:shadow-none";
const COMBO_INPUT_CLASS =
  "min-w-0 flex-1 border-0 bg-transparent px-4 py-3 outline-none shadow-none focus:ring-0 focus:shadow-none";
const COMBO_SELECT_CLASS =
  "cursor-pointer appearance-none border-0 bg-transparent py-3 pl-3 pr-9 text-sm font-semibold text-gray-700 outline-none shadow-none focus:ring-0 focus:shadow-none";

export default function DaysToPrepareInput({
  id,
  name,
  value,
  onChange,
  listId = "days-to-prepare-options",
}) {
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
      <div className="group/days relative shrink-0">
        <select
          aria-label={`${name} preset`}
          value={selectedDay}
          onChange={(event) => onChange(event.target.value)}
          className={COMBO_SELECT_CLASS}
        >
          {DAY_OPTIONS.map((day) => (
            <option key={day} value={day}>
              {day} day{day === 1 ? "" : "s"}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform duration-300 ease-in-out group-focus-within/days:rotate-180"
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
