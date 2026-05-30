import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const listboxId = useId();

  const allOptions = useMemo(() => flattenOptions(options, groups), [options, groups]);
  const selectedOption = allOptions.find((option) => option.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  const updateMenuPosition = () => {
    const trigger = rootRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = compact ? Math.max(rect.width, 96) : rect.width;
    let left = compact ? rect.right - menuWidth : rect.left;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    const estimatedMenuHeight = Math.min(
      compact ? allOptions.length * 40 + 16 : Math.min(allOptions.length * 40 + (groups.length * 32), 240),
      240
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight + 12 && rect.top > estimatedMenuHeight + 12;
    const top = openUpward ? rect.top - estimatedMenuHeight - 4 : rect.bottom + 4;

    setMenuStyle({
      position: "fixed",
      top: Math.max(viewportPadding, top),
      left,
      width: menuWidth,
      zIndex: 9999,
      maxHeight: openUpward ? Math.min(estimatedMenuHeight, rect.top - viewportPadding - 4) : Math.min(240, spaceBelow - viewportPadding),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, compact, allOptions.length, groups.length]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
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
    ? "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
    : "overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg";

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
          isSelected ? "bg-orange-50 font-semibold text-orange-700" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        {option.label}
      </button>
    );
  }

  const menu = open && menuStyle
    ? createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          style={menuStyle}
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
        </div>,
        document.body
      )
    : null;

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
      {menu}
    </div>
  );
}
