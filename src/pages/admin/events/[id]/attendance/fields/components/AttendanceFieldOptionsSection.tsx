import type { FieldArrayWithId, UseFormRegister } from 'react-hook-form';

import { Button, SectionCard } from '@/components/ui';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600';

type AttendanceFieldOptionsSectionProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionFields: FieldArrayWithId<any, 'options', 'id'>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  append: (value: { label: string; value: string }) => void;
  remove: (index: number) => void;
};

export function AttendanceFieldOptionsSection({
  optionFields,
  register,
  errors,
  append,
  remove,
}: AttendanceFieldOptionsSectionProps) {
  return (
    <SectionCard title="Options" subtitle="Define the choices available for this field.">
      <div className="space-y-3">
        {optionFields.length === 0 && (
          <p className="text-sm text-muted">No options added yet. Add at least one option.</p>
        )}
        {optionFields.map((optField, index) => (
          <div
            key={optField.id}
            className="rounded-xl border border-border bg-background/60 p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <p className="text-sm font-semibold text-text">Option {index + 1}</p>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="block text-xs text-muted">Display label</span>
                <input
                  {...register(`options.${index}.label`)}
                  placeholder="e.g., Table A"
                  className={inputClass}
                />
                {errors.options?.[index]?.label && (
                  <p className="text-xs text-red-600">{errors.options[index].label.message}</p>
                )}
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-muted">Stored value</span>
                <input
                  {...register(`options.${index}.value`)}
                  placeholder="e.g., table_a"
                  className={inputClass}
                />
                {errors.options?.[index]?.value && (
                  <p className="text-xs text-red-600">{errors.options[index].value.message}</p>
                )}
              </label>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="primaryOutline"
          onClick={() => append({ label: '', value: '' })}
        >
          Add Option
        </Button>
      </div>
    </SectionCard>
  );
}
