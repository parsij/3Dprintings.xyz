import React, { useMemo, useState } from "react";

const StarRating = ({
  value = 0,
  onChange,
  max = 5,
  readOnly = false,
  className = "",
  starClassName = "w-6 h-6",
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  const normalizedValue = useMemo(() => {
    const parsed = Number(value) || 0;
    return Math.max(0, Math.min(max, parsed));
  }, [value, max]);

  const stars = Array.from({ length: max }, (_, idx) => idx + 1);
  const activeValue = hoverValue > 0 ? hoverValue : normalizedValue;

  return (
    <div
      className={`flex items-center gap-1 ${className}`.trim()}
      onMouseLeave={() => setHoverValue(0)}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${normalizedValue} out of ${max} stars` : "Star rating"}
    >
      {stars.map((star) => {
        const isActive = star <= activeValue;

        return (
          <button
            key={star}
            type="button"
            onClick={() => {
              if (!readOnly && onChange) onChange(star);
            }}
            onMouseEnter={() => {
              if (!readOnly) setHoverValue(star);
            }}
            className={`transition-all duration-100 ease-in-out border-0 outline-none shadow-none hover:shadow-none focus:outline-none focus:ring-0 focus:shadow-none active:shadow-none ${starClassName} ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-108"
            } ${isActive ? "text-yellow-400" : "text-gray-300"}`}
            disabled={readOnly}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-checked={!readOnly ? star === normalizedValue : undefined}
            role={!readOnly ? "radio" : undefined}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor" aria-hidden="true">
              <path d="M12 2.25L15.06 8.45L22 9.46L16.97 14.36L18.16 21.28L12 18.04L5.84 21.28L7.03 14.36L2 9.46L8.94 8.45L12 2.25Z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;