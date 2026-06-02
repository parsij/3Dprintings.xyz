import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

function flattenOptions(options = [], groups = []) {
  if (groups.length > 0) {
    return groups.flatMap((group) => group.options || []);
  }
  return options;
}

export default function SearchableCustomSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  groups = [],
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  ariaLabel,
  triggerClassName = "",
  menuClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const listboxId = useId();

  const allOptions = useMemo(() => flattenOptions(options, groups), [options, groups]);
  const selectedOption = allOptions.find((option) => option.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!groups.length) {
      const nextOptions = normalizedQuery
        ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
        : options;
      return [{ label: "", options: nextOptions }];
    }

    return groups
      .map((group) => ({
        ...group,
        options: (group.options || []).filter((option) => {
          if (!normalizedQuery) return true;
          const haystack = `${group.label} ${option.label}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        }),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, normalizedQuery, options]);

  const filteredOptionCount = filteredGroups.reduce(
    (count, group) => count + (group.options?.length || 0),
    0
  );

  const updateMenuPosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = rect.width;
    let left = rect.left;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    const estimatedMenuHeight = Math.min(Math.max(filteredOptionCount * 40 + 72, 160), 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight + 12 && rect.top > estimatedMenuHeight + 12;
    const top = openUpward ? rect.top - estimatedMenuHeight - 4 : rect.bottom + 4;

    setMenuStyle({
      position: "fixed",
      top: Math.max(viewportPadding, top),
      left,
      width: menuWidth,
      zIndex: 9999,
      maxHeight: openUpward
        ? Math.min(estimatedMenuHeight, rect.top - viewportPadding - 4)
        : Math.min(320, spaceBelow - viewportPadding),
    });
  }, [filteredOptionCount]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

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
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function chooseOption(nextValue) {
    onChange(nextValue);
    setSearchQuery("");
    setOpen(false);
  }

  function toggleOpen() {
    if (open) {
      setOpen(false);
      setSearchQuery("");
      return;
    }

    updateMenuPosition();
    setOpen(true);
  }

  const defaultTriggerClass =
    "w-full cursor-pointer rounded-xl border border-gray-300 bg-white py-3 pl-4 pr-10 text-left outline-none shadow-none transition-colors duration-200 hover:border-orange-200 focus:border-orange-500";

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
          className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg ${menuClassName}`}
        >
          <div className="border-b border-gray-100 px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptionCount === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">No matches found.</p>
            ) : filteredGroups.some((group) => group.label) ? (
              filteredGroups.map((group) => (
                <div key={group.label}>
                  {group.label ? (
                    <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                      {group.label}
                    </div>
                  ) : null}
                  {group.options.map((option) => renderOption(option))}
                </div>
              ))
            ) : (
              filteredGroups[0]?.options.map((option) => renderOption(option))
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={rootRef} className="relative w-full">
      {name ? <input type="hidden" name={name} value={value || ""} /> : null}
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={toggleOpen}
        className={`${defaultTriggerClass} ${triggerClassName} ${!selectedOption ? "text-gray-500" : ""}`}
      >
        {displayLabel}
      </button>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform duration-300 ease-in-out ${
          open ? "rotate-180" : ""
        }`}
      />
      {menu}
    </div>
  );
}
