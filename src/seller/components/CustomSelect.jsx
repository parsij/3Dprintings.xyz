import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

function flattenOptions(options = [], groups = []) {
  if (groups.length > 0) {
    return groups.flatMap((group) => group.options || []);
  }
  return options;
}

export default function CustomSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  groups = [],
  placeholder = "Select...",
  ariaLabel,
  compact = false,
  triggerClassName = "",
  menuClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listboxId = useId();

  const allOptions = useMemo(() => flattenOptions(options, groups), [options, groups]);
  const selectedOption = allOptions.find((option) => option.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function chooseOption(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  const defaultTriggerClass = compact
    ? "cursor-pointer border-0 bg-transparent py-3 pl-3 pr-9 text-left text-sm font-semibold text-gray-700 outline-none shadow-none"
    : "w-full cursor-pointer rounded-xl border border-gray-300 bg-white py-3 pl-4 pr-10 text-left outline-none shadow-none transition-colors duration-200 hover:border-orange-200 focus:border-orange-500";

  const defaultMenuClass = compact
    ? "absolute right-0 top-full z-20 mt-1 min-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-none"
    : "absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-none";

  function renderOption(option) {
    const isSelected = option.value === value;
    return (
      <button
        key={option.value}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => chooseOption(option.value)}
        className={`block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors duration-150 ${
          isSelected ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        {option.label}
      </button>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${compact ? "shrink-0" : "w-full"}`}>
      {name ? <input type="hidden" name={name} value={value || ""} /> : null}
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className={`${defaultTriggerClass} ${triggerClassName} ${!selectedOption ? "text-gray-500" : ""}`}
      >
        {displayLabel}
      </button>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform duration-300 ease-in-out ${
          compact ? "right-2" : "right-3"
        } ${open ? "rotate-180" : ""}`}
      />
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className={`${defaultMenuClass} ${menuClassName}`}
        >
          {groups.length > 0
            ? groups.map((group) => (
                <div key={group.label}>
                  <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    {group.label}
                  </div>
                  {group.options.map((option) => renderOption(option))}
                </div>
              ))
            : options.map((option) => renderOption(option))}
        </div>
      ) : null}
    </div>
  );
}
