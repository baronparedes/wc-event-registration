import type { UseFormRegister } from 'react-hook-form';

import { SectionCard } from '@/components/ui/SectionCard';
import type { EventFieldFormValues } from '@/lib/domain/event-fields';

import { RuleInput } from './RuleInput';

type ValidationRulesSectionProps = {
  isStructurallyLocked: boolean;
  showTextValidation: boolean;
  showNumberValidation: boolean;
  showMultiSelectValidation: boolean;
  showDateValidation: boolean;
  register: UseFormRegister<EventFieldFormValues>;
  uniqueKeyComponentError?: string;
};

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
] as const;

/** Section for all validation rule inputs (text, number, date, multi-select). */
export function ValidationRulesSection({
  isStructurallyLocked,
  showTextValidation,
  showNumberValidation,
  showMultiSelectValidation,
  showDateValidation,
  register,
  uniqueKeyComponentError,
}: ValidationRulesSectionProps) {
  return (
    <SectionCard
      title="Validation Rules"
      subtitle={
        isStructurallyLocked
          ? 'Validation rules are locked on published and archived events.'
          : 'Optional constraints applied when the form is submitted.'
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5">
            <input
              type="checkbox"
              disabled={isStructurallyLocked}
              {...register('val_unique_key_component')}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border"
            />
            <span>
              <span className="block text-sm font-medium text-text">Use In Duplicate Matching</span>
              <span className="block text-xs text-muted">
                Unique means this field participates in duplicate detection. If two submissions have
                the same values for all fields marked as unique, they are treated as duplicates.
              </span>
            </span>
          </label>
          {uniqueKeyComponentError && (
            <p className="mt-2 text-sm text-danger">{uniqueKeyComponentError}</p>
          )}
        </div>

        {showTextValidation && (
          <>
            <RuleInput
              id="val_min_length"
              label="Minimum Length"
              type="number"
              registration={register('val_min_length')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 3"
              helperText="Minimum number of characters required."
            />
            <RuleInput
              id="val_max_length"
              label="Maximum Length"
              type="number"
              registration={register('val_max_length')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 100"
              helperText="Maximum number of characters allowed."
            />
            <div className="sm:col-span-2">
              <RuleInput
                id="val_pattern"
                label="Pattern (Regex)"
                type="text"
                registration={register('val_pattern')}
                disabled={isStructurallyLocked}
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
              disabled={isStructurallyLocked}
              placeholder="e.g., 0"
            />
            <RuleInput
              id="val_max"
              label="Maximum Value"
              type="number"
              registration={register('val_max')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 10"
            />
          </>
        )}
        {showMultiSelectValidation && (
          <>
            <RuleInput
              id="val_min_selections"
              label="Minimum Selections"
              type="number"
              registration={register('val_min_selections')}
              disabled={isStructurallyLocked}
              placeholder="e.g., 1"
              helperText="Minimum number of options the registrant must select."
            />
            <RuleInput
              id="val_max_selections"
              label="Maximum Selections"
              type="number"
              registration={register('val_max_selections')}
              disabled={isStructurallyLocked}
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
              registration={register('val_min_date')}
              disabled={isStructurallyLocked}
            />
            <RuleInput
              id="val_max_date"
              label="Latest Allowed Date"
              type="date"
              registration={register('val_max_date')}
              disabled={isStructurallyLocked}
            />
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-text">Allowed Weekdays</p>
              <p className="mt-1 text-xs text-muted">
                Restrict date selection to specific weekdays. Leave all unchecked to allow any day.
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
                      disabled={isStructurallyLocked}
                      {...register('val_allowed_weekdays')}
                      className="h-4 w-4 cursor-pointer rounded border-border"
                    />
                    <span className="text-sm text-text">{weekday.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
