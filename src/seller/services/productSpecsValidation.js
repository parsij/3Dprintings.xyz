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
