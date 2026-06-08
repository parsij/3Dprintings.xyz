import { useMemo, useState } from "react";
import SearchableCustomSelect from "../components/SearchableCustomSelect.jsx";
import { CATEGORY_DATA } from "./SubmitModel.jsx";
import { FILAMENT_TYPES } from "../constants/filamentTypes.js";
import { FieldLabel, RequiredMark } from "../components/listingFormUi.jsx";
import {
  DEFAULT_LISTING_DETAILS,
  validateListingDetails,
} from "../services/listingDetailsValidation.js";

const categoryGroups = CATEGORY_DATA.map((group) => ({
  label: group.title,
  options: group.subcategories.map((sub) => ({
    value: sub.label,
    label: sub.label,
  })),
}));

const ITEM_TYPE_OPTIONS = [
  { value: "physical", label: "Physical item" },
  { value: "digital", label: "Digital file" },
];

const MADE_BY_OPTIONS = [
  { value: "i_made_it", label: "I made it" },
  { value: "someone_in_shop", label: "Someone in my shop" },
  { value: "another_person", label: "Another person or a company" },
];

const ITEM_KIND_OPTIONS = [
  { value: "finished_product", label: "A finished product" },
  { value: "supply_or_tool", label: "A supply or a tool to configure and make things" },
];

function RadioGroup({ name, legend, value, onChange, options, showErrors, error, vertical = false }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 block text-sm font-semibold text-gray-700">
        {legend} <RequiredMark />
      </legend>
      <div className={vertical ? "space-y-2" : "flex flex-wrap gap-4"}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm text-gray-700 transition ${
              value === option.value
                ? "border-orange-400 bg-orange-50 text-orange-900"
                : "border-gray-200 bg-white hover:border-orange-200"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            {option.label}
          </label>
        ))}
      </div>
      {showErrors && error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </fieldset>
  );
}

export default function ListingItemDetails({ initialDetails = DEFAULT_LISTING_DETAILS, onContinue }) {
  const [details, setDetails] = useState(initialDetails);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validateListingDetails(details), [details]);
  const isValid = Object.keys(errors).length === 0;

  function updateField(field, value) {
    setDetails((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "itemType" && value === "digital") {
        next.materialType = "";
      }
      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (!isValid) return;
    onContinue(details);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tell us about your item</h2>
        <p className="mt-1 text-sm text-gray-600">
          Choose a category and answer a few questions before adding photos and pricing.
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="listingCategory">Category</FieldLabel>
        <SearchableCustomSelect
          id="listingCategory"
          name="category"
          value={details.category}
          onChange={(nextValue) => updateField("category", nextValue)}
          placeholder="Select a category..."
          searchPlaceholder="Search categories..."
          ariaLabel="Category"
          groups={categoryGroups}
        />
        {submitted && errors.category ? (
          <p className="mt-1 text-xs text-red-500">{errors.category}</p>
        ) : null}
        {details.category === "Other" ? (
          <p className="mt-2 text-xs font-semibold text-red-600">
            Setting your product category as &quot;Other&quot; makes your products have less sales compared to others.
          </p>
        ) : null}
      </div>

      <RadioGroup
        name="itemType"
        legend="Is the item you are trying to sell a physical item or a digital file?"
        value={details.itemType}
        onChange={(value) => updateField("itemType", value)}
        options={ITEM_TYPE_OPTIONS}
        showErrors={submitted}
        error={errors.itemType}
      />

      <RadioGroup
        name="madeBy"
        legend="Who made it?"
        value={details.madeBy}
        onChange={(value) => updateField("madeBy", value)}
        options={MADE_BY_OPTIONS}
        showErrors={submitted}
        error={errors.madeBy}
        vertical
      />

      <RadioGroup
        name="itemKind"
        legend="What is it?"
        value={details.itemKind}
        onChange={(value) => updateField("itemKind", value)}
        options={ITEM_KIND_OPTIONS}
        showErrors={submitted}
        error={errors.itemKind}
        vertical
      />

      {details.itemType === "physical" ? (
        <div>
          <FieldLabel htmlFor="materialType">What is it made out of?</FieldLabel>
          <SearchableCustomSelect
            id="materialType"
            name="materialType"
            value={details.materialType}
            onChange={(nextValue) => updateField("materialType", nextValue)}
            placeholder="Select a material..."
            searchPlaceholder="Search filament types..."
            ariaLabel="Material type"
            options={FILAMENT_TYPES}
          />
          {submitted && errors.materialType ? (
            <p className="mt-1 text-xs text-red-500">{errors.materialType}</p>
          ) : null}
        </div>
      ) : null}

      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={details.aiUsed}
          onChange={(event) => updateField("aiUsed", event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        />
        <span>This model was made with help of Ai or any form of LLM.</span>
      </label>

      <button
        type="submit"
        className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-400"
      >
        Save and continue
      </button>
    </form>
  );
}
