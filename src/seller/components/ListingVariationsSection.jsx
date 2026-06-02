import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { DEFAULT_VARIATION_PRESETS } from "../constants/listingColors.js";
import { FILAMENT_TYPES } from "../constants/filamentTypes.js";

const MAX_OPTIONS = 9;

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildPresetVariation(preset) {
  const defaultOptions = preset.key === "filament"
    ? FILAMENT_TYPES.slice(0, 8).map((entry) => entry.label)
    : preset.defaultOptions;

  return {
    id: createId("variation"),
    name: preset.label,
    presetKey: preset.key,
    options: defaultOptions.slice(0, MAX_OPTIONS).map((label) => ({
      id: createId("option"),
      label,
      price: "",
      visible: true,
    })),
  };
}

function AddVariationModal({ open, onClose, onSelectPreset, onCreateCustom }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-bold text-gray-900">What kind of variation is your product?</h4>
            <p className="mt-1 text-sm text-gray-600">
              Choose a variation listed here for the best results and usability, or make your own.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-2">
          {DEFAULT_VARIATION_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className="rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onCreateCustom}
            className="rounded-xl border border-dashed border-orange-300 bg-orange-50/40 px-4 py-3 text-left text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
          >
            Create your own
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomVariationModal({ open, initialVariation, onClose, onDone, onDelete }) {
  const [draft, setDraft] = useState(() => initialVariation);
  const [optionInput, setOptionInput] = useState("");
  const [dragIndex, setDragIndex] = useState(null);

  if (!open || !draft) return null;

  function addOption() {
    const label = optionInput.trim();
    if (!label || draft.options.length >= MAX_OPTIONS) return;
    setDraft((prev) => ({
      ...prev,
      options: [...prev.options, { id: createId("option"), label, price: "", visible: true }],
    }));
    setOptionInput("");
  }

  function removeOption(optionId) {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.filter((option) => option.id !== optionId),
    }));
  }

  function reorderOptions(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    setDraft((prev) => {
      const nextOptions = [...prev.options];
      const [moved] = nextOptions.splice(fromIndex, 1);
      nextOptions.splice(toIndex, 0, moved);
      return { ...prev, options: nextOptions };
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h4 className="text-lg font-bold text-gray-900">Custom variation</h4>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            placeholder="Variation name"
          />
        </label>

        <div className="mb-3">
          <span className="mb-2 block text-sm font-semibold text-gray-700">Options</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={optionInput}
              onChange={(event) => setOptionInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOption();
                }
              }}
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Add an option"
            />
            <button
              type="button"
              onClick={addOption}
              disabled={!optionInput.trim() || draft.options.length >= MAX_OPTIONS}
              className="inline-flex items-center gap-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Up to {MAX_OPTIONS} options per variation.</p>
        </div>

        <div className="space-y-2">
          {draft.options.map((option, index) => (
            <div
              key={option.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex == null) return;
                reorderOptions(dragIndex, index);
                setDragIndex(null);
              }}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{option.label}</span>
              <button
                type="button"
                onClick={() => removeOption(option.id)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-red-600"
                aria-label={`Delete ${option.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => onDelete?.(draft.id)}
            className="text-sm font-semibold text-red-600 hover:text-red-700"
          >
            Delete variation
          </button>
          <button
            type="button"
            onClick={() => onDone(draft)}
            disabled={!draft.name.trim() || draft.options.length === 0}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ListingVariationsSection({ variations, onChange, showErrors, error }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState(null);

  function addPresetVariation(preset) {
    onChange([...variations, buildPresetVariation(preset)]);
    setPickerOpen(false);
  }

  function openCustomVariation(existing = null) {
    setEditingVariation(
      existing || {
        id: createId("variation"),
        name: "",
        presetKey: "custom",
        options: [],
      }
    );
    setPickerOpen(false);
    setCustomOpen(true);
  }

  function saveCustomVariation(variation) {
    const exists = variations.some((entry) => entry.id === variation.id);
    onChange(
      exists
        ? variations.map((entry) => (entry.id === variation.id ? variation : entry))
        : [...variations, variation]
    );
    setCustomOpen(false);
    setEditingVariation(null);
  }

  function deleteVariation(variationId) {
    onChange(variations.filter((entry) => entry.id !== variationId));
    setCustomOpen(false);
    setEditingVariation(null);
  }

  function updateOption(variationId, optionId, patch) {
    onChange(
      variations.map((variation) => {
        if (variation.id !== variationId) return variation;
        return {
          ...variation,
          options: variation.options.map((option) =>
            option.id === optionId ? { ...option, ...patch } : option
          ),
        };
      })
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900">Variations</h4>
          <p className="text-xs text-gray-500">Optional price and visibility per option.</p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-orange-300 hover:text-orange-700"
        >
          <Plus className="h-4 w-4" />
          Add variations
        </button>
      </div>

      {showErrors && error ? <p className="mb-2 text-xs text-red-500">{error}</p> : null}

      <div className="space-y-4">
        {variations.map((variation) => (
          <div key={variation.id} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h5 className="font-semibold text-gray-900">{variation.name}</h5>
              <button
                type="button"
                onClick={() => openCustomVariation(variation)}
                className="text-xs font-semibold text-orange-700 hover:text-orange-800"
              >
                Edit
              </button>
            </div>
            <div className="space-y-2">
              {variation.options.map((option) => (
                <div key={option.id} className="grid grid-cols-[1fr_120px_88px] items-center gap-2">
                  <span className="truncate text-sm text-gray-700">{option.label}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={option.price}
                    onChange={(event) =>
                      updateOption(variation.id, option.id, { price: event.target.value })
                    }
                    placeholder="Price"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500"
                  />
                  <label className="inline-flex items-center justify-end gap-2 text-xs font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={option.visible !== false}
                      onChange={(event) =>
                        updateOption(variation.id, option.id, { visible: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    Visible
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AddVariationModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectPreset={addPresetVariation}
        onCreateCustom={() => openCustomVariation()}
      />

      <CustomVariationModal
        key={editingVariation?.id || "new-variation"}
        open={customOpen}
        initialVariation={editingVariation}
        onClose={() => {
          setCustomOpen(false);
          setEditingVariation(null);
        }}
        onDone={saveCustomVariation}
        onDelete={deleteVariation}
      />
    </div>
  );
}
