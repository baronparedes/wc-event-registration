import type { FieldValues, Path, UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

import { SectionCard } from '@/components/ui/SectionCard';

type RuleInputProps = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date';
  registration: UseFormRegisterReturn;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
};

function RuleInput({
  id,
  label,
  type,
  registration,
  disabled,
  placeholder,
  helperText,
  min,
  max,
  step,
}: RuleInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-text">
        {label}
      </label>
      <input
        {...registration}
        id={id}
        type={type}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          type === 'date' ? 'min-w-0 appearance-none' : ''
        }`}
      />
      {helperText && <p className="mt-1 text-xs text-muted leading-relaxed">{helperText}</p>}
    </div>
  );
}

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
] as const;

export interface DynamicFieldValidationRulesSectionProps<TFieldValues extends FieldValues> {
  showTextValidation?: boolean;
  showNumberValidation?: boolean;
  showRatingValidation?: boolean;
  showMultiSelectValidation?: boolean;
  showDateValidation?: boolean;
  disabled?: boolean;
  register: UseFormRegister<TFieldValues>;
  allowUniqueMatching?: boolean;
  uniqueKeyComponentError?: string;
  allowDateExtraRules?: boolean;
}

/**
 * Shared validation rules form section for dynamic fields across Events, Forms, and Attendance.
 */
export function DynamicFieldValidationRulesSection<TFieldValues extends FieldValues>({
  showTextValidation,
  showNumberValidation,
  showRatingValidation,
  showMultiSelectValidation,
  showDateValidation,
  disabled = false,
  register,
  allowUniqueMatching = false,
  uniqueKeyComponentError,
  allowDateExtraRules = false,
}: DynamicFieldValidationRulesSectionProps<TFieldValues>) {
  const hasAnyValidation =
    showTextValidation ||
    showNumberValidation ||
    showRatingValidation ||
    showMultiSelectValidation ||
    showDateValidation ||
    allowUniqueMatching;

  if (!hasAnyValidation) {
    return null;
  }

  return (
    <SectionCard
      title="Validation Rules"
      subtitle={
        disabled
          ? 'Validation rules are locked on published and archived records.'
          : 'Optional constraints applied when the form is submitted.'
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {allowUniqueMatching && (
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5">
              <input
                type="checkbox"
                disabled={disabled}
                {...register('val_unique_key_component' as Path<TFieldValues>)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border"
              />
              <span>
                <span className="block text-sm font-medium text-text">
                  Use In Duplicate Matching
                </span>
                <span className="block text-xs text-muted leading-relaxed">
                  Unique means this field participates in duplicate detection. If two submissions
                  have the same values for all fields marked as unique, they are treated as
                  duplicates.
                </span>
              </span>
            </label>
            {uniqueKeyComponentError && (
              <p className="mt-2 text-sm text-danger">{uniqueKeyComponentError}</p>
            )}
          </div>
        )}

        {showTextValidation && (
          <>
            <RuleInput
              id="val_min_length"
              label="Minimum Length"
              type="number"
              registration={register('val_min_length' as Path<TFieldValues>)}
              disabled={disabled}
              placeholder="e.g., 3"
              helperText="Minimum number of characters required."
            />
            <RuleInput
              id="val_max_length"
              label="Maximum Length"
              type="number"
              registration={register('val_max_length' as Path<TFieldValues>)}
              disabled={disabled}
              placeholder="e.g., 100"
              helperText="Maximum number of characters allowed."
            />
            <div className="sm:col-span-2">
              <RuleInput
                id="val_pattern"
                label="Pattern (Regex)"
                type="text"
                registration={register('val_pattern' as Path<TFieldValues>)}
                disabled={disabled}
                placeholder="e.g., ^[A-Za-z\s]+$"
                helperText="Optional regular expression the value must match."
              />
            </div>
          </>
        )}

        {showNumberValidation && (
          <>
            <RuleInput
              id="val_min"
              label="Minimum Value"
              type="number"
              registration={register('val_min' as Path<TFieldValues>)}
              disabled={disabled}
              placeholder="e.g., 0"
            />
            <RuleInput
              id="val_max"
              label="Maximum Value"
              type="number"
              registration={register('val_max' as Path<TFieldValues>)}
              disabled={disabled}
              placeholder="e.g., 10"
            />
          </>
        )}

        {showRatingValidation && (
          <div className="sm:col-span-2">
            <RuleInput
              id="val_max"
              label="Max Stars / Rating Scale"
              type="number"
              registration={register('val_max' as Path<TFieldValues>)}
              disabled={disabled}
              min={1}
              max={10}
              step={1}
              placeholder="5"
              helperText="Number of stars to display (1–10, default 5)."
            />
          </div>
        )}

        {showMultiSelectValidation && (
          <>
            <RuleInput
              id="val_min_selections"
              label="Minimum Selections"
              type="number"
              registration={register('val_min_selections' as Path<TFieldValues>)}
              disabled={disabled}
              placeholder="e.g., 1"
              helperText="Minimum number of options the registrant must select."
            />
            <RuleInput
              id="val_max_selections"
              label="Maximum Selections"
              type="number"
              registration={register('val_max_selections' as Path<TFieldValues>)}
              disabled={disabled}
              placeholder="e.g., 3"
              helperText="Maximum number of options allowed."
            />
          </>
        )}

        {showDateValidation && (
          <>
            <RuleInput
              id="val_min_date"
              label="Earliest Allowed Date"
              type="date"
              registration={register('val_min_date' as Path<TFieldValues>)}
              disabled={disabled}
            />
            <RuleInput
              id="val_max_date"
              label="Latest Allowed Date"
              type="date"
              registration={register('val_max_date' as Path<TFieldValues>)}
              disabled={disabled}
            />
            {allowDateExtraRules && (
              <>
                <RuleInput
                  id="val_max_past_days"
                  label="Max Days In The Past"
                  type="number"
                  registration={register('val_max_past_days' as Path<TFieldValues>)}
                  disabled={disabled}
                  placeholder="e.g., 14"
                  helperText="Set 14 to disallow dates older than two weeks ago."
                />
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-text">Allowed Weekdays</p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Restrict date selection to specific weekdays. Leave all unchecked to allow any
                    day.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {WEEKDAY_OPTIONS.map((weekday) => (
                      <label
                        key={weekday.value}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2"
                      >
                        <input
                          type="checkbox"
                          value={weekday.value}
                          disabled={disabled}
                          {...register('val_allowed_weekdays' as Path<TFieldValues>)}
                          className="h-4 w-4 cursor-pointer rounded border-border"
                        />
                        <span className="text-sm text-text">{weekday.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}
