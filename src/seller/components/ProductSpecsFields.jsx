import UnitNumberInput from "./UnitNumberInput.jsx";
import DaysToPrepareInput from "./DaysToPrepareInput.jsx";
import { SectionTitle } from "./listingFormUi.jsx";
import {
  validateDaysToPrepare,
  validateDimensionInput,
  validateWeightInput,
} from "../../utils/productDimensions.js";

const DIMENSION_FIELDS = [
  ["modelHeight", "Height"],
  ["modelWidth", "Width"],
  ["modelLength", "Length"],
];

export function validateProductSpecs(form) {
  const errors = {};

  const weightError = validateWeightInput(form.modelWeight, form.modelWeightUnit);
  if (weightError) {
    errors.modelWeight = weightError;
  }

  DIMENSION_FIELDS.forEach(([field, label]) => {
    const dimensionError = validateDimensionInput(form[field], form.modelDimensionUnit, label);
    if (dimensionError) {
      errors[field] = dimensionError;
    }
  });

  const daysToPrepareError = validateDaysToPrepare(form.daysToPrepare);
  if (daysToPrepareError) {
    errors.daysToPrepare = daysToPrepareError;
  }

  return errors;
}

export default function ProductSpecsFields({
  form,
  onUnitChange,
  onDimensionValueChange,
  onDaysToPrepareChange,
  showErrors = false,
  errors = {},
}) {
  return (
    <>
      <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm">
        <SectionTitle>Model weight</SectionTitle>
        <p className="mt-1 text-xs text-gray-600">
          Enter a number greater than 0 with at most 1 decimal place. Maximum weight is 50 kg.
        </p>
        <div className="mt-2">
          <UnitNumberInput
            id="modelWeight"
            name="modelWeight"
            value={form.modelWeight}
            unit={form.modelWeightUnit}
            units={[
              { value: "lb", label: "lb" },
              { value: "kg", label: "kg" },
            ]}
            allowOneDecimal
            onValueChange={(value) => onDimensionValueChange("modelWeight", value)}
            onUnitChange={(value) => onUnitChange("modelWeightUnit", value)}
            placeholder="Weight"
          />
        </div>
        {showErrors && errors.modelWeight ? (
          <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.modelWeight}</p>
        ) : null}
      </div>

      <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm">
        <SectionTitle>Model dimensions</SectionTitle>
        <p className="mt-1 text-xs text-gray-600">
          Enter numbers greater than 0 with at most 1 decimal place. Each side can be at most 300 cm.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {DIMENSION_FIELDS.map(([field, label]) => (
            <div key={field}>
              <label htmlFor={field} className="mb-1 block text-xs font-semibold text-gray-700">
                {label}
              </label>
              <UnitNumberInput
                id={field}
                name={field}
                value={form[field]}
                unit={form.modelDimensionUnit}
                units={[
                  { value: "in", label: "in" },
                  { value: "cm", label: "cm" },
                ]}
                allowOneDecimal
                onValueChange={(value) => onDimensionValueChange(field, value)}
                onUnitChange={(value) => onUnitChange("modelDimensionUnit", value)}
                placeholder={label}
              />
              {showErrors && errors[field] ? (
                <p className="mt-1 text-xs text-red-500 animate-pulse">{errors[field]}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm">
        <SectionTitle>Days to prepare</SectionTitle>
        <p className="mt-1 text-xs text-gray-600">
          How many days you need to print and pack this item before shipping. Choose 1 to 7 days.
        </p>
        <div className="mt-2 max-w-xs">
          <DaysToPrepareInput
            id="daysToPrepare"
            name="daysToPrepare"
            value={form.daysToPrepare}
            onChange={onDaysToPrepareChange}
          />
        </div>
        {showErrors && errors.daysToPrepare ? (
          <p className="mt-1 text-xs text-red-500 animate-pulse">{errors.daysToPrepare}</p>
        ) : null}
      </div>
    </>
  );
}
