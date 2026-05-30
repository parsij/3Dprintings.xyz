const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

function sanitizeDaysInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 1);
}

export default function DaysToPrepareInput({
  id,
  name,
  value,
  onChange,
  listId = "days-to-prepare-options",
}) {
  return (
    <div className="flex">
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
        className="min-w-0 flex-1 rounded-l-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
      />
      <select
        aria-label={`${name} preset`}
        value={DAY_OPTIONS.includes(Number(value)) ? String(value) : ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-r-xl border border-l-0 border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
      >
        <option value="">Pick</option>
        {DAY_OPTIONS.map((day) => (
          <option key={day} value={day}>
            {day} day{day === 1 ? "" : "s"}
          </option>
        ))}
      </select>
      <datalist id={listId}>
        {DAY_OPTIONS.map((day) => (
          <option key={day} value={day} />
        ))}
      </datalist>
    </div>
  );
}
