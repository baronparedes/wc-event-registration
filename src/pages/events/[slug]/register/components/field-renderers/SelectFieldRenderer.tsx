import { type UseFormReturn, useWatch } from 'react-hook-form';

import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary';

type SelectFieldRendererProps = {
  field: PublicEventField;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
};

export function SelectFieldRenderer({ field, dynamicForm }: SelectFieldRendererProps) {
  return (
    <select
      id={`field-${field.field_key}`}
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    >
      <option value="">Select an option</option>
      {field.options.map((option: { value: string; label: string }) => (
        <option key={`${field.id}-${option.value}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function RadioFieldRenderer({ field, dynamicForm }: SelectFieldRendererProps) {
  return (
    <div className="space-y-2">
      {field.options.map((option: { value: string; label: string }) => (
        <label
          key={`${field.id}-${option.value}`}
          className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text"
        >
          <input type="radio" value={option.value} {...dynamicForm.register(field.field_key)} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export function MultiSelectFieldRenderer({ field, dynamicForm }: SelectFieldRendererProps) {
  return (
    <div className="space-y-2">
      {field.options.map((option: { value: string; label: string }) => (
        <label
          key={`${field.id}-${option.value}`}
          className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text"
        >
          <input type="checkbox" value={option.value} {...dynamicForm.register(field.field_key)} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function isBooleanOrNullRecord(value: unknown): value is Record<string, boolean | null> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === 'boolean' || entry === null);
}

export function MultiSelectToggleFieldRenderer({ field, dynamicForm }: SelectFieldRendererProps) {
  const rawValue = useWatch({ control: dynamicForm.control, name: field.field_key });
  const selectedValues = isBooleanOrNullRecord(rawValue) ? rawValue : {};

  function handleSelectionChange(optionValue: string, checked: boolean, defaultValue?: boolean) {
    const nextValues = { ...selectedValues };

    if (checked) {
      nextValues[optionValue] = defaultValue ?? null;
    } else {
      delete nextValues[optionValue];
    }

    dynamicForm.setValue(field.field_key, nextValues, {
      shouldDirty: true,
      shouldValidate: true,
    });
    dynamicForm.clearErrors(field.field_key);
  }

  function handleToggleChange(optionValue: string, value: boolean) {
    if (!(optionValue in selectedValues)) {
      return;
    }

    dynamicForm.setValue(
      field.field_key,
      {
        ...selectedValues,
        [optionValue]: value,
      },
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
    dynamicForm.clearErrors(field.field_key);
  }

  return (
    <div className="space-y-2">
      {field.options.map(
        (option: {
          value: string;
          label: string;
          toggle_label?: string;
          toggle_default?: boolean;
        }) => {
          const isSelected = option.value in selectedValues;
          const configuredDefault = option.toggle_default;
          const toggleValue = selectedValues[option.value];
          const isToggleChoicePending = isSelected && toggleValue === null;
          const isYesSelected = toggleValue === true;
          const isNoSelected = toggleValue === false;

          return (
            <div
              key={`${field.id}-${option.value}`}
              className={`rounded-md border px-3 py-2 text-sm text-text transition-colors ${
                isToggleChoicePending
                  ? 'border-accent/60 bg-accent/5'
                  : 'border-border/70 bg-transparent'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    className="h-5 w-5 accent-primary"
                    onChange={(event) =>
                      handleSelectionChange(option.value, event.target.checked, configuredDefault)
                    }
                  />
                  <span>{option.label}</span>
                </label>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium text-muted">
                    {option.toggle_label && option.toggle_label.length > 0
                      ? option.toggle_label
                      : 'Snack?'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`${option.label} - Yes`}
                      disabled={!isSelected}
                      onClick={() => handleToggleChange(option.value, true)}
                      className={`min-w-16 rounded-md border px-3 py-1 text-xs font-medium text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        isYesSelected
                          ? 'border-4 border-primary bg-background text-primary shadow-sm ring-1 ring-primary/20'
                          : 'border-border bg-background text-text hover:bg-primary/5'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      aria-label={`${option.label} - No`}
                      disabled={!isSelected}
                      onClick={() => handleToggleChange(option.value, false)}
                      className={`min-w-16 rounded-md border px-3 py-1 text-xs font-medium text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        isNoSelected
                          ? 'border-4 border-primary bg-background text-primary shadow-sm ring-1 ring-primary/20'
                          : 'border-border bg-background text-text hover:bg-primary/5'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      No
                    </button>
                  </div>
                  {isToggleChoicePending && (
                    <p className="text-xs font-medium text-accent">Choose Yes or No to continue.</p>
                  )}
                </div>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
