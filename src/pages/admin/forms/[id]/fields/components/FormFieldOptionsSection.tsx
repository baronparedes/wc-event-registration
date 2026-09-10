import type { FieldArrayWithId, UseFieldArrayReturn, UseFormRegister } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/SectionCard';
import type { FormFieldFormValues } from '@/lib/domain/forms';

type FormFieldOptionsSectionProps = {
  optionFields: FieldArrayWithId<FormFieldFormValues, 'options', 'id'>[];
  register: UseFormRegister<FormFieldFormValues>;
  errors: Record<string, unknown>;
  append: UseFieldArrayReturn<FormFieldFormValues>['append'];
  remove: UseFieldArrayReturn<FormFieldFormValues>['remove'];
};

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30';

/** Section for choice field options (select, radio, multi-select). */
export function FormFieldOptionsSection({
  optionFields,
  register,
  errors,
  append,
  remove,
}: FormFieldOptionsSectionProps) {
  return (
    <SectionCard title="Options" subtitle="Define the choices available to respondents.">
      <div className="space-y-3">
        {optionFields.length === 0 && (
          <p className="text-sm text-muted">No options added yet. Add at least one option.</p>
        )}
        {optionFields.map((field, index) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fieldErrors = errors as any;
          const labelError = fieldErrors.options?.[index]?.label?.message as string | undefined;
          const valueError = fieldErrors.options?.[index]?.value?.message as string | undefined;

          return (
            <div
              key={field.id}
              className="rounded-xl border border-border bg-background/60 p-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
                <div>
                  <p className="text-sm font-semibold text-text">Option {index + 1}</p>
                  <p className="text-xs text-muted">Configure the display text and stored value.</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove option ${index + 1}`}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-text">
                  <span className="block text-xs text-muted">Display label</span>
                  <input
                    {...register(`options.${index}.label`)}
                    placeholder="Display label (e.g., Option A)"
                    aria-label={`Option ${index + 1} label`}
                    className={`${inputClass} ${labelError ? 'border-red-400' : ''}`}
                  />
                  <p className={`min-h-4 text-xs ${labelError ? 'text-red-600' : 'invisible'}`}>
                    {labelError ?? '.'}
                  </p>
                </label>

                <label className="space-y-1 text-sm text-text">
                  <span className="block text-xs text-muted">Stored value</span>
                  <input
                    {...register(`options.${index}.value`)}
                    placeholder="Stored value (e.g., option_a)"
                    aria-label={`Option ${index + 1} value`}
                    className={`${inputClass} ${valueError ? 'border-red-400' : ''}`}
                  />
                  <p className={`min-h-4 text-xs ${valueError ? 'text-red-600' : 'invisible'}`}>
                    {valueError ?? '.'}
                  </p>
                </label>
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="primaryOutline"
          onClick={() => append({ label: '', value: '' })}
        >
          + Add Option
        </Button>
      </div>
    </SectionCard>
  );
}
