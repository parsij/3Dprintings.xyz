import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import TrackingSection from "./TrackingSection.jsx";

export default function CollapsibleTrackingSection({
  tracking,
  title = "Shipping details",
  hideLabel = "Hide",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="inline-flex items-center gap-2 py-1 text-sm font-semibold text-gray-900 transition-colors duration-200 hover:text-orange-600 focus:outline-none"
      >
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-current transition-transform duration-300 ease-in-out ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
        <span className="inline-block min-w-[7.75rem] text-left">{isOpen ? hideLabel : title}</span>
      </button>

      <div
        id={panelId}
        aria-hidden={!isOpen}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-2">
            <TrackingSection tracking={tracking} showHeader={false} embedded showAllEvents />
          </div>
        </div>
      </div>
    </div>
  );
}
