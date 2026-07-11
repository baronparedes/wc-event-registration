import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button, CheckboxField, FormInputField, SectionCard } from '@/components/ui';
import { VALIDATION_PATTERNS } from '@/config/constants';
import {
  useCreateAttendanceFieldMutation,
  useUpdateAttendanceFieldMutation,
} from '@/hooks/domain/attendance-fields';
import {
  ATTENDANCE_FIELD_TYPES,
  ATTENDANCE_FIELD_TYPE_LABELS,
  attendanceFieldTypeHasDateValidation,
  attendanceFieldTypeHasMultiSelectValidation,
  attendanceFieldTypeHasNumberValidation,
  attendanceFieldTypeHasOptions,
  attendanceFieldTypeHasTextValidation,
} from '@/lib/domain/attendance-fields';
import type { AttendanceField, AttendanceFieldTypeEnum } from '@/lib/domain/attendance-fields';

import { AttendanceFieldTypeSelector } from './AttendanceFieldTypeSelector';
import { RuleInput } from './RuleInput';

function normalizeOptionalNumberInput(value: unknown): unknown {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

const attendanceFieldPanelSchema = z.object({
  field_key: z
    .string()
    .min(1, 'Field key is required')
    .max(100, 'Field key must be 100 characters or less')
    .regex(
      VALIDATION_PATTERNS.fieldKey,
      'Field key must use only lowercase letters, numbers, and underscores (e.g., table_name)',
    ),
  label: z.string().min(1, 'Field label is required').max(200, 'Field label is too long'),
  field_type: z.enum(ATTENDANCE_FIELD_TYPES),
  is_required: z.boolean(),
  is_active: z.boolean(),
  options: z.array(
    z.object({
      label: z.string().min(1, 'Option label is required'),
      value: z.string().min(1, 'Option value is required'),
    }),
  ),
  val_min_length: z.preprocess(
    normalizeOptionalNumberInput,
    z.number().int().nonnegative().optional(),
  ),
  val_max_length: z.preprocess(
    normalizeOptionalNumberInput,
    z.number().int().nonnegative().optional(),
  ),
  val_pattern: z.string().optional().or(z.literal('')),
  val_min: z.preprocess(normalizeOptionalNumberInput, z.number().optional()),
  val_max: z.preprocess(normalizeOptionalNumberInput, z.number().optional()),
  val_min_selections: z.preprocess(
    normalizeOptionalNumberInput,
    z.number().int().nonnegative().optional(),
  ),
  val_max_selections: z.preprocess(
    normalizeOptionalNumberInput,
    z.number().int().nonnegative().optional(),
  ),
  val_min_date: z.string().optional().or(z.literal('')),
  val_max_date: z.string().optional().or(z.literal('')),
});

type AttendanceFieldPanelValues = z.infer<typeof attendanceFieldPanelSchema>;

type AttendanceFieldEditPanelProps = {
  eventId: string;
  field: AttendanceField | null;
  onClose: () => void;
};

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600';

/** Panel for creating or editing an attendance field. Matches the event field panel UX. */
export function AttendanceFieldEditPanel({
  eventId,
  field,
  onClose,
}: AttendanceFieldEditPanelProps) {
  const isEditing = field !== null;
  const createMutation = useCreateAttendanceFieldMutation();
  const updateMutation = useUpdateAttendanceFieldMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty, isValid },
  } = useForm<AttendanceFieldPanelValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(attendanceFieldPanelSchema) as any,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: isEditing
      ? {
          field_key: field.field_key,
          label: field.label,
          field_type: field.field_type,
          is_required: field.is_required,
          is_active: field.is_active,
          options: (field.options ?? []).map((o) => ({ label: o.label, value: o.value })),
          val_min_length: field.validation_rules?.min_length,
          val_max_length: field.validation_rules?.max_length,
          val_pattern: field.validation_rules?.pattern ?? '',
          val_min: field.validation_rules?.min,
          val_max: field.validation_rules?.max,
          val_min_selections: field.validation_rules?.min_selections,
          val_max_selections: field.validation_rules?.max_selections,
          val_min_date: field.validation_rules?.min_date ?? '',
          val_max_date: field.validation_rules?.max_date ?? '',
        }
      : {
          field_key: '',
          label: '',
          field_type: 'text',
          is_required: false,
          is_active: true,
          options: [],
          val_min_length: undefined,
          val_max_length: undefined,
          val_pattern: '',
          val_min: undefined,
          val_max: undefined,
          val_min_selections: undefined,
          val_max_selections: undefined,
          val_min_date: '',
          val_max_date: '',
        },
  });

  const { fields: optionFields, append, remove } = useFieldArray({ control, name: 'options' });
  const selectedFieldType = useWatch({ control, name: 'field_type' }) as AttendanceFieldTypeEnum;
  const showOptions = attendanceFieldTypeHasOptions(selectedFieldType);

  function handleTypeSelect(type: AttendanceFieldTypeEnum) {
    setValue('field_type', type, { shouldDirty: true, shouldValidate: true });
    setValue('options', []);
  }

  async function onSubmit(values: AttendanceFieldPanelValues) {
    try {
      const validationRules = {
        ...(values.val_min_length !== undefined && { min_length: values.val_min_length }),
        ...(values.val_max_length !== undefined && { max_length: values.val_max_length }),
        ...(values.val_pattern && { pattern: values.val_pattern }),
        ...(values.val_min !== undefined && { min: values.val_min }),
        ...(values.val_max !== undefined && { max: values.val_max }),
        ...(values.val_min_selections !== undefined && {
          min_selections: values.val_min_selections,
        }),
        ...(values.val_max_selections !== undefined && {
          max_selections: values.val_max_selections,
        }),
        ...(values.val_min_date && { min_date: values.val_min_date }),
        ...(values.val_max_date && { max_date: values.val_max_date }),
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: field.id,
          event_id: eventId,
          label: values.label,
          is_required: values.is_required,
          is_active: values.is_active,
          options: showOptions ? values.options : [],
          validation_rules: validationRules,
        });
        toast.success('Attendance field updated.');
      } else {
        await createMutation.mutateAsync({
          event_id: eventId,
          field_key: values.field_key,
          label: values.label,
          field_type: values.field_type,
          is_required: values.is_required,
          display_order: 0,
          options: showOptions ? values.options : [],
          validation_rules: validationRules,
        });
        toast.success('Attendance field added.');
      }
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again or contact support.';
      toast.error(message);
    }
  }

  const canSave = isDirty && isValid && !isPending;
  const disabledHint = (() => {
    if (isPending) return 'Save in progress.';
    if (errors.field_key?.message) return `Field Key: ${errors.field_key.message}`;
    if (errors.label?.message) return `Field Label: ${errors.label.message}`;
    if (!isDirty) return 'Make at least one change to enable saving.';
    if (!isValid) return 'Fix the validation errors above.';
    return null;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text">
            {isEditing ? 'Edit Attendance Field' : 'Add Attendance Field'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-1 text-muted hover:bg-muted/10 hover:text-text"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handleSubmit(onSubmit as any)(e).catch(console.error);
          }}
          className="space-y-5 p-6"
        >
          {/* Field Type */}
          {!isEditing ? (
            <SectionCard title="Field Type">
              <AttendanceFieldTypeSelector
                value={selectedFieldType}
                onChange={handleTypeSelect}
                error={errors.field_type?.message}
              />
            </SectionCard>
          ) : (
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-xs text-gray-600">Field Type</p>
              <p className="mt-0.5 text-sm font-medium text-text">
                {ATTENDANCE_FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                <span className="ml-2 text-xs text-gray-600">
                  (cannot be changed after creation)
                </span>
              </p>
            </div>
          )}

          {/* Field Details */}
          <SectionCard title="Field Details">
            <div className="space-y-4">
              {!isEditing ? (
                <FormInputField
                  id="field_key"
                  label="Field Key"
                  registration={register('field_key')}
                  error={errors.field_key?.message}
                  required
                  placeholder="e.g., table_number"
                  helperText="Lowercase letters, numbers, and underscores only. Cannot be changed after creation."
                />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-text">Field Key</p>
                  <p className="rounded-md border border-border bg-gray-100 px-3 py-2 text-sm text-gray-700">
                    {field.field_key}
                    <span className="ml-2 text-xs text-gray-600">(cannot be changed)</span>
                  </p>
                </div>
              )}

              <FormInputField
                id="label"
                label="Label"
                registration={register('label')}
                error={errors.label?.message}
                required
                placeholder="e.g., Table Number"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CheckboxField
                  id="is_required"
                  label="Required"
                  description="Administrators must provide a value for this field."
                  registration={register('is_required')}
                />
                <CheckboxField
                  id="is_active"
                  label="Active"
                  description="Show this field when collecting attendance."
                  registration={register('is_active')}
                />
              </div>
            </div>
          </SectionCard>

          {/* Options */}
          {showOptions && (
            <SectionCard title="Options" subtitle="Define the choices available for this field.">
              <div className="space-y-3">
                {optionFields.length === 0 && (
                  <p className="text-sm text-muted">
                    No options added yet. Add at least one option.
                  </p>
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
                          <p className="text-xs text-red-600">
                            {errors.options[index].label.message}
                          </p>
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
                          <p className="text-xs text-red-600">
                            {errors.options[index].value.message}
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ label: '', value: '' })}
                >
                  Add Option
                </Button>
              </div>
            </SectionCard>
          )}

          {/* Validation Rules */}
          {(attendanceFieldTypeHasTextValidation(selectedFieldType) ||
            attendanceFieldTypeHasNumberValidation(selectedFieldType) ||
            attendanceFieldTypeHasMultiSelectValidation(selectedFieldType) ||
            attendanceFieldTypeHasDateValidation(selectedFieldType)) && (
            <SectionCard
              title="Validation Rules"
              subtitle="Optional constraints applied when the form is submitted."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {attendanceFieldTypeHasTextValidation(selectedFieldType) && (
                  <>
                    <RuleInput
                      id="val_min_length"
                      label="Minimum Length"
                      type="number"
                      registration={register('val_min_length', { valueAsNumber: true })}
                      placeholder="e.g., 3"
                      helperText="Minimum number of characters required."
                    />
                    <RuleInput
                      id="val_max_length"
                      label="Maximum Length"
                      type="number"
                      registration={register('val_max_length', { valueAsNumber: true })}
                      placeholder="e.g., 100"
                      helperText="Maximum number of characters allowed."
                    />
                    <div className="sm:col-span-2">
                      <RuleInput
                        id="val_pattern"
                        label="Pattern (Regex)"
                        type="text"
                        registration={register('val_pattern')}
                        placeholder="e.g., ^[A-Za-z\\s]+$"
                        helperText="Optional regular expression the value must match."
                      />
                    </div>
                  </>
                )}
                {attendanceFieldTypeHasNumberValidation(selectedFieldType) && (
                  <>
                    <RuleInput
                      id="val_min"
                      label="Minimum Value"
                      type="number"
                      registration={register('val_min', { valueAsNumber: true })}
                      placeholder="e.g., 0"
                    />
                    <RuleInput
                      id="val_max"
                      label="Maximum Value"
                      type="number"
                      registration={register('val_max', { valueAsNumber: true })}
                      placeholder="e.g., 10"
                    />
                  </>
                )}
                {attendanceFieldTypeHasMultiSelectValidation(selectedFieldType) && (
                  <>
                    <RuleInput
                      id="val_min_selections"
                      label="Minimum Selections"
                      type="number"
                      registration={register('val_min_selections', { valueAsNumber: true })}
                      placeholder="e.g., 1"
                      helperText="Minimum number of options the user must select."
                    />
                    <RuleInput
                      id="val_max_selections"
                      label="Maximum Selections"
                      type="number"
                      registration={register('val_max_selections', { valueAsNumber: true })}
                      placeholder="e.g., 5"
                      helperText="Maximum number of options the user can select."
                    />
                  </>
                )}
                {attendanceFieldTypeHasDateValidation(selectedFieldType) && (
                  <>
                    <RuleInput
                      id="val_min_date"
                      label="Earliest Date"
                      type="date"
                      registration={register('val_min_date')}
                      helperText="Earliest date the user can select."
                    />
                    <RuleInput
                      id="val_max_date"
                      label="Latest Date"
                      type="date"
                      registration={register('val_max_date')}
                      helperText="Latest date the user can select."
                    />
                  </>
                )}
              </div>
            </SectionCard>
          )}

          {/* Footer */}
          <div className="border-t border-border pt-4">
            {!canSave && disabledHint && (
              <p
                className="mb-2 text-right text-xs text-amber-700"
                role="status"
                aria-live="polite"
              >
                {disabledHint}
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" size="md" disabled={!canSave}>
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Field'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
