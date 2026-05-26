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
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2"
      >
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-gray-600 transition-transform duration-300 ease-in-out ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
        <span className="text-sm font-semibold text-gray-900">
          {isOpen ? hideLabel : title}
        </span>
      </button>

      <div
        id={panelId}
        aria-hidden={!isOpen}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <TrackingSection tracking={tracking} title="Tracking" />
          </div>
        </div>
      </div>
    </section>
  );
}
