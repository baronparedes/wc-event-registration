import type { UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

import { SectionCard } from '@/components/ui/SectionCard';
import type { FormFieldFormValues } from '@/lib/domain/forms';

type RuleInputProps = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date';
  registration: UseFormRegisterReturn;
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
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          type === 'date' ? 'min-w-0 appearance-none' : ''
        }`}
      />
      {helperText && <p className="mt-1 text-xs text-muted">{helperText}</p>}
    </div>
  );
}

type FormFieldValidationSectionProps = {
  showTextValidation: boolean;
  showNumberValidation: boolean;
  showRatingValidation: boolean;
  showMultiSelectValidation: boolean;
  showDateValidation: boolean;
  register: UseFormRegister<FormFieldFormValues>;
};

/** Section for validation rule inputs (text, number, rating, date, multi-select). */
export function FormFieldValidationSection({
  showTextValidation,
  showNumberValidation,
  showRatingValidation,
  showMultiSelectValidation,
  showDateValidation,
  register,
}: FormFieldValidationSectionProps) {
  return (
    <SectionCard
      title="Validation Rules"
      subtitle="Optional constraints applied when the form is submitted."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showTextValidation && (
          <>
            <RuleInput
              id="val_min_length"
              label="Minimum Length"
              type="number"
              registration={register('val_min_length')}
              placeholder="e.g., 3"
              helperText="Minimum number of characters required."
            />
            <RuleInput
              id="val_max_length"
              label="Maximum Length"
              type="number"
              registration={register('val_max_length')}
              placeholder="e.g., 100"
              helperText="Maximum number of characters allowed."
            />
            <div className="sm:col-span-2">
              <RuleInput
                id="val_pattern"
                label="Pattern (Regex)"
                type="text"
                registration={register('val_pattern')}
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
              registration={register('val_min')}
              placeholder="e.g., 0"
            />
            <RuleInput
              id="val_max"
              label="Maximum Value"
              type="number"
              registration={register('val_max')}
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
              registration={register('val_max')}
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
              registration={register('val_min_selections')}
              placeholder="e.g., 1"
            />
            <RuleInput
              id="val_max_selections"
              label="Maximum Selections"
              type="number"
              registration={register('val_max_selections')}
              placeholder="e.g., 3"
            />
          </>
        )}
        {showDateValidation && (
          <>
            <RuleInput
              id="val_min_date"
              label="Earliest Allowed Date"
              type="date"
              registration={register('val_min_date')}
            />
            <RuleInput
              id="val_max_date"
              label="Latest Allowed Date"
              type="date"
              registration={register('val_max_date')}
            />
          </>
        )}
      </div>
    </SectionCard>
  );
}
