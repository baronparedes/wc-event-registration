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

const ROLE_ALLOTMENTS_TOOLTIP =
  'Role matching is case-insensitive. Each matched registration consumes one slot. When role allotments are set, max slots are derived from their total.';

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
        const canAddRoleAllotments = !isCapacityLocked;
        const derivedSlotsTotal = optionRoleAllotments.reduce((sum, entry) => {
          const parsed = Number(entry.alloted_slots.trim());
          return Number.isInteger(parsed) && parsed > 0 ? sum + parsed : sum;
        }, 0);
        const hasRoleAllotments = optionRoleAllotments.length > 0;

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
            className="rounded-xl border border-border bg-background/60 p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
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

            <div className="mt-4 space-y-4">
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
                <div className="rounded-lg border border-border/70 bg-surface p-3">
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
                <div className="rounded-lg border border-border/70 bg-surface p-3">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                    Capacity
                  </p>
                  <p className="mb-3 text-xs text-muted">
                    {hasRoleAllotments
                      ? `Derived total from role allotments: ${derivedSlotsTotal}`
                      : 'No role allotments configured. Capacity remains open.'}
                  </p>

                  <div className="mt-3 space-y-2 text-sm text-text">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        Role allotments
                        <span className="group relative inline-flex">
                          <span
                            tabIndex={0}
                            role="img"
                            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border text-[10px] font-semibold leading-none text-muted transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                            aria-label="Role allotments help"
                          >
                            ?
                          </span>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-md border border-border bg-surface p-2 text-left text-[11px] leading-4 text-text opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                          >
                            {ROLE_ALLOTMENTS_TOOLTIP}
                          </span>
                        </span>
                      </span>
                      {!isCapacityLocked && (
                        <button
                          type="button"
                          onClick={addRoleAllotment}
                          disabled={!canAddRoleAllotments}
                          className="text-xs font-medium text-primary hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted"
                        >
                          + Add role
                        </button>
                      )}
                    </div>

                    {!hasRoleAllotments && (
                      <p className="text-xs text-muted">No role allotments yet.</p>
                    )}

                    {optionRoleAllotments.map((_, allotmentIndex) => {
                      const roleError =
                        errors.options?.[index]?.role_allotments?.[allotmentIndex]?.role?.message;
                      const slotsError =
                        errors.options?.[index]?.role_allotments?.[allotmentIndex]?.alloted_slots
                          ?.message;
                      const allotedSlotsPath =
                        `options.${index}.role_allotments.${allotmentIndex}.alloted_slots` as const;

                      return (
                        <div
                          key={`${field.id}-allotment-${allotmentIndex}`}
                          className="grid gap-2 rounded-md border border-border/70 p-3 sm:grid-cols-[minmax(0,1fr)_170px_auto] sm:items-start"
                        >
                          <label className="space-y-1">
                            <span className="block text-xs text-muted">Role</span>
                            <input
                              {...register(
                                `options.${index}.role_allotments.${allotmentIndex}.role`,
                                {
                                  validate: (value) =>
                                    value.trim().length > 0 || 'Role is required.',
                                },
                              )}
                              disabled={isCapacityLocked}
                              placeholder="e.g., Prayer Coach"
                              className={`${inputClass} ${roleError ? 'border-red-400' : ''}`}
                            />
                            <p
                              className={`min-h-8 text-xs ${roleError ? 'text-red-600' : 'invisible'}`}
                            >
                              {roleError ?? '.'}
                            </p>
                          </label>

                          <label className="space-y-1">
                            <span className="block text-xs text-muted">Allotted slots</span>
                            <input
                              {...register(allotedSlotsPath, {
                                validate: (value) => {
                                  const trimmed = value.trim();
                                  const parsed = Number(trimmed);
                                  if (!trimmed || !Number.isInteger(parsed) || parsed <= 0) {
                                    return 'Enter a whole number greater than 0.';
                                  }

                                  return true;
                                },
                              })}
                              disabled={isCapacityLocked}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="e.g., 10"
                              className={`${inputClass} ${slotsError ? 'border-red-400' : ''}`}
                            />
                            <p
                              className={`min-h-8 text-xs ${slotsError ? 'text-red-600' : 'invisible'}`}
                            >
                              {slotsError ?? '.'}
                            </p>
                          </label>

                          {!isCapacityLocked && (
                            <button
                              type="button"
                              onClick={() => removeRoleAllotment(allotmentIndex)}
                              className="mt-6 text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {!isOptionStructureLocked && (
        <Button
          type="button"
          variant="outline"
          size="sm"
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
