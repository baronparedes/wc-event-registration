import { type UseFormReturn, useWatch } from 'react-hook-form';

import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary';

type SelectFieldRendererProps = {
  field: PublicEventField;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
  memberRole?: string;
  remainingSlotsByOption?: Record<string, number>;
  remainingSlotsByRoleByOption?: Record<string, Record<string, number>>;
};

function normalizeRole(role: string | undefined): string | null {
  const primaryRole = role?.split('/')[0]?.trim();
  const normalizedRole = primaryRole?.toLowerCase();
  return normalizedRole ? normalizedRole : null;
}

function isOptionUnavailableForRole(
  field: PublicEventField,
  optionValue: string,
  memberRole: string | undefined,
  remainingSlotsByOption?: Record<string, number>,
  remainingSlotsByRoleByOption?: Record<string, Record<string, number>>,
): boolean {
  const configuredRoleAllotments = field.validation_rules.max_slots_role_allotments?.[optionValue];

  if (configuredRoleAllotments && configuredRoleAllotments.length > 0) {
    const normalizedRole = normalizeRole(memberRole);

    if (!normalizedRole) {
      return false;
    }

    const matchingRoleEntry = configuredRoleAllotments.find(
      (entry) => entry.role.trim().toLowerCase() === normalizedRole,
    );

    if (!matchingRoleEntry) {
      const remainingForOption = remainingSlotsByOption?.[optionValue];
      return typeof remainingForOption === 'number' ? remainingForOption <= 0 : false;
    }

    const remainingForRole = remainingSlotsByRoleByOption?.[optionValue]?.[normalizedRole];
    const effectiveRemaining =
      typeof remainingForRole === 'number' ? remainingForRole : matchingRoleEntry.alloted_slots;

    return effectiveRemaining <= 0;
  }

  const remainingForOption = remainingSlotsByOption?.[optionValue];
  return typeof remainingForOption === 'number' ? remainingForOption <= 0 : false;
}

function formatAllottedSlotsLabel(
  optionValue: string,
  remainingSlotsByOption?: Record<string, number>,
): string | null {
  const remainingCount = remainingSlotsByOption?.[optionValue];
  if (typeof remainingCount !== 'number') {
    return null;
  }

  return `${Math.max(0, remainingCount)} left`;
}

function getOptionRemainingLabel(
  option: { value: string; label: string },
  remainingSlotsByOption?: Record<string, number>,
): string | null {
  return formatAllottedSlotsLabel(option.value, remainingSlotsByOption);
}

function getOptionRoleRemainingLabel(
  field: PublicEventField,
  option: { value: string; label: string },
  remainingSlotsByRoleByOption?: Record<string, Record<string, number>>,
): string | null {
  const configuredRoleAllotments =
    field.validation_rules.max_slots_role_allotments?.[option.value] ?? [];
  if (configuredRoleAllotments.length === 0) {
    return null;
  }

  const remainingByRole = remainingSlotsByRoleByOption?.[option.value] ?? {};
  const roleSegments = configuredRoleAllotments.map((entry) => {
    const normalizedRole = entry.role.trim().toLowerCase();
    const remaining = remainingByRole[normalizedRole];
    const safeRemaining =
      typeof remaining === 'number' ? Math.max(0, remaining) : entry.alloted_slots;
    return `${entry.role}: ${safeRemaining} left`;
  });

  return roleSegments.join(', ');
}

function getOptionSlotMetadata(
  field: PublicEventField,
  option: { value: string; label: string },
  remainingSlotsByOption?: Record<string, number>,
  remainingSlotsByRoleByOption?: Record<string, Record<string, number>>,
) {
  const remainingLabel = getOptionRemainingLabel(option, remainingSlotsByOption);
  const roleRemainingLabel = getOptionRoleRemainingLabel(
    field,
    option,
    remainingSlotsByRoleByOption,
  );

  return {
    remainingLabel,
    roleRemainingLabel,
    combinedInlineLabel: [remainingLabel, roleRemainingLabel]
      .filter((entry): entry is string => Boolean(entry))
      .join(' - '),
  };
}

export function SelectFieldRenderer({
  field,
  dynamicForm,
  memberRole,
  remainingSlotsByOption,
  remainingSlotsByRoleByOption,
}: SelectFieldRendererProps) {
  const selectedValue = useWatch({ control: dynamicForm.control, name: field.field_key });

  return (
    <select
      id={`field-${field.field_key}`}
      className={baseInputClassName}
      {...dynamicForm.register(field.field_key)}
    >
      <option value="">Select an option</option>
      {field.options.map((option: { value: string; label: string }) => {
        const isUnavailable = isOptionUnavailableForRole(
          field,
          option.value,
          memberRole,
          remainingSlotsByOption,
          remainingSlotsByRoleByOption,
        );

        const { combinedInlineLabel } = getOptionSlotMetadata(
          field,
          option,
          remainingSlotsByOption,
          remainingSlotsByRoleByOption,
        );

        return (
          <option
            key={`${field.id}-${option.value}`}
            value={option.value}
            disabled={isUnavailable && selectedValue !== option.value}
          >
            {combinedInlineLabel ? `${option.label} (${combinedInlineLabel})` : option.label}
          </option>
        );
      })}
    </select>
  );
}

export function RadioFieldRenderer({
  field,
  dynamicForm,
  memberRole,
  remainingSlotsByOption,
  remainingSlotsByRoleByOption,
}: SelectFieldRendererProps) {
  const selectedValue = useWatch({ control: dynamicForm.control, name: field.field_key });

  return (
    <div className="space-y-2">
      {field.options.map((option: { value: string; label: string }) => {
        const isUnavailable = isOptionUnavailableForRole(
          field,
          option.value,
          memberRole,
          remainingSlotsByOption,
          remainingSlotsByRoleByOption,
        );
        const isDisabled = isUnavailable && selectedValue !== option.value;

        const { remainingLabel, roleRemainingLabel } = getOptionSlotMetadata(
          field,
          option,
          remainingSlotsByOption,
          remainingSlotsByRoleByOption,
        );

        return (
          <label
            key={`${field.id}-${option.value}`}
            className={`flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text ${
              isDisabled ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            <input
              type="radio"
              value={option.value}
              disabled={isDisabled}
              {...dynamicForm.register(field.field_key)}
            />

            <span className="flex flex-col">
              <span>{option.label}</span>
              {remainingLabel && <span className="text-xs text-muted">{remainingLabel}</span>}
              {roleRemainingLabel && (
                <span className="text-xs text-muted">{roleRemainingLabel}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function MultiSelectFieldRenderer({
  field,
  dynamicForm,
  memberRole,
  remainingSlotsByOption,
  remainingSlotsByRoleByOption,
}: SelectFieldRendererProps) {
  const selectedValues = useWatch({ control: dynamicForm.control, name: field.field_key });
  const normalizedSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];

  return (
    <div className="space-y-2">
      {field.options.map((option: { value: string; label: string }) => {
        const isUnavailable = isOptionUnavailableForRole(
          field,
          option.value,
          memberRole,
          remainingSlotsByOption,
          remainingSlotsByRoleByOption,
        );
        const isDisabled = isUnavailable && !normalizedSelectedValues.includes(option.value);

        const { remainingLabel, roleRemainingLabel } = getOptionSlotMetadata(
          field,
          option,
          remainingSlotsByOption,
          remainingSlotsByRoleByOption,
        );

        return (
          <label
            key={`${field.id}-${option.value}`}
            className={`flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-text ${
              isDisabled ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            <input
              type="checkbox"
              value={option.value}
              disabled={isDisabled}
              {...dynamicForm.register(field.field_key)}
            />
            <span className="flex flex-col">
              <span>{option.label}</span>
              {remainingLabel && <span className="text-xs text-muted">{remainingLabel}</span>}
              {roleRemainingLabel && (
                <span className="text-xs text-muted">{roleRemainingLabel}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function isBooleanOrNullRecord(value: unknown): value is Record<string, boolean | null> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === 'boolean' || entry === null);
}

export function MultiSelectToggleFieldRenderer({
  field,
  dynamicForm,
  memberRole,
  remainingSlotsByOption,
  remainingSlotsByRoleByOption,
}: SelectFieldRendererProps) {
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
          const isUnavailable = isOptionUnavailableForRole(
            field,
            option.value,
            memberRole,
            remainingSlotsByOption,
            remainingSlotsByRoleByOption,
          );
          const isDisabled = isUnavailable && !isSelected;
          const configuredDefault = option.toggle_default;
          const toggleValue = selectedValues[option.value];
          const isToggleChoicePending = isSelected && toggleValue === null;
          const isYesSelected = toggleValue === true;
          const isNoSelected = toggleValue === false;
          const {
            remainingLabel: optionRemainingLabel,
            roleRemainingLabel: optionRoleRemainingLabel,
          } = getOptionSlotMetadata(
            field,
            option,
            remainingSlotsByOption,
            remainingSlotsByRoleByOption,
          );

          return (
            <div
              key={`${field.id}-${option.value}`}
              data-slot-option-card="true"
              className={`rounded-[14px] border px-4 py-3 text-sm text-text transition-all ${
                isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'border-primary/50 bg-primary/5 shadow-xs'
                  : isToggleChoicePending
                    ? 'border-accent/60 bg-accent/5'
                    : 'border-border/70 bg-transparent'
              }`}
              onClick={(event) => {
                const target = event.target as HTMLElement;

                if (
                  isDisabled ||
                  target.closest('button') ||
                  target.closest('label') ||
                  target.closest('input')
                ) {
                  return;
                }

                handleSelectionChange(option.value, !isSelected, configuredDefault);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    className="h-6 w-6 accent-primary"
                    onChange={(event) =>
                      handleSelectionChange(option.value, event.target.checked, configuredDefault)
                    }
                  />
                  <span className="text-base font-semibold leading-tight">{option.label}</span>
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
                      className={`min-w-[74px] rounded-md border px-3 py-2 text-sm font-medium text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
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
                      className={`min-w-[74px] rounded-md border px-3 py-2 text-sm font-medium text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
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

              {(optionRemainingLabel || optionRoleRemainingLabel) && (
                <div className="mt-3 space-y-1 border-t border-border/50 pt-2">
                  {optionRemainingLabel && (
                    <p className="text-sm text-muted">{optionRemainingLabel}</p>
                  )}
                  {optionRoleRemainingLabel && (
                    <p className="text-xs text-muted">{optionRoleRemainingLabel}</p>
                  )}
                </div>
              )}
            </div>
          );
        },
      )}
    </div>
  );
}
