import type {
  Control,
  FieldArrayWithId,
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import type { EventFieldFormValues } from '@/lib/domain/event-fields';
import type { EventFieldTypeEnum } from '@/lib/domain/event-fields';

import { FieldOptionsCapacityEditor } from './FieldOptionsCapacityEditor';

type FieldOptionsEditorProps = {
  fields: FieldArrayWithId<EventFieldFormValues, 'options', 'id'>[];
  register: UseFormRegister<EventFieldFormValues>;
  control: Control<EventFieldFormValues>;
  setValue: UseFormSetValue<EventFieldFormValues>;
  errors: FieldErrors<EventFieldFormValues>;
  remove: UseFieldArrayRemove;
  append: UseFieldArrayAppend<EventFieldFormValues, 'options'>;
  isOptionStructureLocked: boolean;
  isCapacityLocked: boolean;
  selectedFieldType: EventFieldTypeEnum;
};

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600';

/** Manages the options list for select, radio, and multi_select field types. */
export function FieldOptionsEditor({
  fields,
  register,
  control,
  setValue,
  errors,
  remove,
  append,
  isOptionStructureLocked,
  isCapacityLocked,
  selectedFieldType,
}: FieldOptionsEditorProps) {
  const watchedOptions = useWatch({ control, name: 'options' }) ?? [];

  const showToggleLabel = selectedFieldType === 'multi_select_toggle';
  const showCapacity =
    selectedFieldType === 'select' ||
    selectedFieldType === 'radio' ||
    selectedFieldType === 'multi_select' ||
    selectedFieldType === 'multi_select_toggle';

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-sm text-muted">No options added yet. Add at least one option.</p>
      )}
      {fields.map((field, index) => {
        const labelError = errors.options?.[index]?.label?.message;
        const valueError = errors.options?.[index]?.value?.message;
        const toggleLabelError = errors.options?.[index]?.toggle_label?.message;
        const optionRoleAllotments = watchedOptions[index]?.role_allotments ?? [];

        const addRoleAllotment = () => {
          const nextAllotments = [...optionRoleAllotments, { role: '', alloted_slots: '' }];
          setValue(`options.${index}.role_allotments`, nextAllotments, {
            shouldDirty: true,
            shouldValidate: true,
          });
        };

        const removeRoleAllotment = (allotmentIndex: number) => {
          const nextAllotments = optionRoleAllotments.filter((_, idx) => idx !== allotmentIndex);
          setValue(`options.${index}.role_allotments`, nextAllotments, {
            shouldDirty: true,
            shouldValidate: true,
          });
        };

        return (
          <div
            key={field.id}
            className="rounded-xl border border-border bg-background/60 p-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
              <div>
                <p className="text-sm font-semibold text-text">Option {index + 1}</p>
                <p className="text-xs text-muted">
                  {showToggleLabel
                    ? 'Configure the display text and its toggle behavior.'
                    : 'Configure the display text and stored value.'}
                </p>
              </div>
              {!isOptionStructureLocked && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove option ${index + 1}`}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-text">
                  <span className="block text-xs text-muted">Display label</span>
                  <input
                    {...register(`options.${index}.label`)}
                    disabled={isOptionStructureLocked}
                    placeholder="Display label (e.g., 9AM)"
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
                    disabled={isOptionStructureLocked}
                    placeholder="Stored value (e.g., 9am)"
                    aria-label={`Option ${index + 1} value`}
                    className={`${inputClass} ${valueError ? 'border-red-400' : ''}`}
                  />
                  <p className={`min-h-4 text-xs ${valueError ? 'text-red-600' : 'invisible'}`}>
                    {valueError ?? '.'}
                  </p>
                </label>
              </div>

              {showToggleLabel && (
                <div className="rounded-lg border border-border/70 bg-surface p-2.5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                    Toggle Settings
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                    <label className="space-y-1 text-sm text-text">
                      <span className="block text-xs text-muted">Default toggle label</span>
                      <input
                        {...register(`options.${index}.toggle_label`)}
                        disabled={isOptionStructureLocked}
                        placeholder="Toggle label (e.g., with Breakfast)"
                        aria-label={`Option ${index + 1} toggle label`}
                        className={`${inputClass} ${toggleLabelError ? 'border-red-400' : ''}`}
                      />
                      <p
                        className={`min-h-4 text-xs ${toggleLabelError ? 'text-red-600' : 'invisible'}`}
                      >
                        {toggleLabelError ?? '.'}
                      </p>
                    </label>

                    <label className="space-y-1 text-sm text-text">
                      <span className="block text-xs text-muted">Default toggle</span>
                      <select
                        {...register(`options.${index}.toggle_default`, {
                          setValueAs: (value) => {
                            if (value === '') {
                              return undefined;
                            }

                            return value === 'true';
                          },
                        })}
                        disabled={isOptionStructureLocked}
                        aria-label={`Option ${index + 1} toggle default`}
                        className={inputClass}
                      >
                        <option value="">Choose...</option>
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {showCapacity && (
                <FieldOptionsCapacityEditor
                  index={index}
                  optionRoleAllotments={optionRoleAllotments}
                  register={register}
                  errors={errors}
                  isCapacityLocked={isCapacityLocked}
                  onAddRoleAllotment={addRoleAllotment}
                  onRemoveRoleAllotment={removeRoleAllotment}
                />
              )}
            </div>
          </div>
        );
      })}

      {!isOptionStructureLocked && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              label: '',
              value: '',
              toggle_label: '',
              max_slots: '',
              role_allotments: [],
            })
          }
        >
          + Add Option
        </Button>
      )}
    </div>
  );
}
