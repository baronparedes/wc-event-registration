import { useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormMultiSelectDropdownField } from '@/components/ui/FormMultiSelectDropdownField';
import { FormSelectField } from '@/components/ui/FormSelectField';
import { useUpsertAttendanceAnswersMutation } from '@/hooks/domain/attendance';
import type {
  AttendanceAnswer,
  AttendanceAnswerEntry,
  AttendanceAnswerSummary,
  AttendeeKind,
  RegistrantAttendanceRow,
} from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';

type AttendanceDataEntryPanelProps = {
  isOpen: boolean;
  eventId: string;
  registrant: RegistrantAttendanceRow;
  fields: AttendanceField[];
  onClose: () => void;
  onSaveSuccess?: (payload: {
    attendeeKind: AttendeeKind;
    registrationId: string | null;
    publicRegistrationId: string | null;
    attendanceAnswers: AttendanceAnswerSummary[];
  }) => void;
};

type AnswerFormValues = {
  [fieldId: string]: string | string[];
};

function getExistingAnswerValue(
  answers: AttendanceAnswer[],
  fieldId: string,
  fieldType: string,
): string | string[] {
  const answer = answers.find((a) => a.attendance_field_id === fieldId);
  if (!answer) return '';

  if (fieldType === 'multi_select') {
    if (!answer.answer_text) return [];

    try {
      const parsed = JSON.parse(answer.answer_text);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  if (fieldType === 'number') {
    return answer.answer_number !== null ? String(answer.answer_number) : '';
  }

  return answer.answer_text ?? '';
}

function buildMutationAnswers(
  fields: AttendanceField[],
  values: AnswerFormValues,
): AttendanceAnswerEntry[] {
  return fields.map((field) => {
    const rawValue = values[field.id] ?? '';

    if (field.field_type === 'number') {
      const parsedValue = Array.isArray(rawValue) ? (rawValue[0] ?? '') : rawValue;
      const num = parsedValue.trim() === '' ? null : Number(parsedValue);

      return {
        attendance_field_id: field.id,
        answer_text: null,
        answer_number: num !== null && !Number.isNaN(num) ? num : null,
      };
    }

    if (field.field_type === 'multi_select') {
      const selectedValues = Array.isArray(rawValue)
        ? rawValue.filter((value) => value.trim().length > 0)
        : [];

      return {
        attendance_field_id: field.id,
        answer_text: selectedValues.length > 0 ? JSON.stringify(selectedValues) : null,
        answer_number: null,
      };
    }

    const parsedValue = Array.isArray(rawValue) ? (rawValue[0] ?? '') : rawValue;

    return {
      attendance_field_id: field.id,
      answer_text: parsedValue.trim().length > 0 ? parsedValue.trim() : null,
      answer_number: null,
    };
  });
}

function buildAttendanceAnswerSummaries(
  fields: AttendanceField[],
  answers: AttendanceAnswerEntry[],
): AttendanceAnswerSummary[] {
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  return answers.flatMap((answer) => {
    const field = fieldsById.get(answer.attendance_field_id);
    if (!field) {
      return [];
    }

    const answerText = typeof answer.answer_text === 'string' ? answer.answer_text.trim() : null;
    const answerNumber = typeof answer.answer_number === 'number' ? answer.answer_number : null;

    if (!answerText && answerNumber === null) {
      return [];
    }

    return [
      {
        attendance_field_id: field.id,
        field_type: field.field_type,
        field_key: field.field_key,
        label: field.label,
        answer_text: answerText,
        answer_number: answerNumber,
      },
    ];
  });
}

/** Panel for entering attendance field answers for a single registrant. */
export function AttendanceDataEntryPanel({
  isOpen,
  eventId,
  registrant,
  fields,
  onClose,
  onSaveSuccess,
}: AttendanceDataEntryPanelProps) {
  const upsertMutation = useUpsertAttendanceAnswersMutation();
  const [openMultiSelectFieldId, setOpenMultiSelectFieldId] = useState<string | null>(null);
  const [requiredMultiSelectErrors, setRequiredMultiSelectErrors] = useState<Record<string, true>>(
    {},
  );

  const defaultValues: AnswerFormValues = {};
  for (const field of fields) {
    defaultValues[field.id] = getExistingAnswerValue(
      registrant.answers,
      field.id,
      field.field_type,
    );
  }

  const { control, register, handleSubmit, setValue } = useForm<AnswerFormValues>({
    defaultValues,
  });
  const formValues = useWatch({ control });

  function getMultiSelectSelectedLabel(field: AttendanceField): string {
    const selectedValues = Array.isArray(formValues[field.id])
      ? (formValues[field.id] as string[])
      : [];

    if (selectedValues.length === 0) {
      return field.is_required ? 'Select option(s)' : 'No selection';
    }

    if (selectedValues.length === 1) {
      const matchingOption = (field.options ?? []).find(
        (option) => option.value === selectedValues[0],
      );
      return matchingOption?.label ?? selectedValues[0];
    }

    return `${selectedValues.length} options selected`;
  }

  function handleToggleMultiSelectOption(fieldId: string, optionValue: string) {
    const currentValues = Array.isArray(formValues[fieldId])
      ? (formValues[fieldId] as string[])
      : [];
    const nextValues = currentValues.includes(optionValue)
      ? currentValues.filter((value) => value !== optionValue)
      : [...currentValues, optionValue];

    setValue(fieldId, nextValues, { shouldDirty: true, shouldValidate: true });
    setRequiredMultiSelectErrors((current) => {
      if (!(fieldId in current)) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[fieldId];
      return nextErrors;
    });
  }

  async function onSubmit(values: AnswerFormValues) {
    try {
      const missingRequiredMultiSelectFields = fields.filter((field) => {
        if (!(field.field_type === 'multi_select' && field.is_required)) {
          return false;
        }

        const rawValue = values[field.id];
        if (!Array.isArray(rawValue)) {
          return true;
        }

        return rawValue.filter((value) => value.trim().length > 0).length === 0;
      });

      if (missingRequiredMultiSelectFields.length > 0) {
        const nextErrors: Record<string, true> = {};
        for (const field of missingRequiredMultiSelectFields) {
          nextErrors[field.id] = true;
        }

        setRequiredMultiSelectErrors(nextErrors);
        toast.error('Select at least one option for all required multi-select fields.');
        return;
      }

      setRequiredMultiSelectErrors({});

      const answers = buildMutationAnswers(fields, values);

      await upsertMutation.mutateAsync({
        event_id: eventId,
        attendee_kind: registrant.attendee_kind,
        registration_id: registrant.registration_id ?? undefined,
        public_registration_id: registrant.public_registration_id ?? undefined,
        answers,
      });

      onSaveSuccess?.({
        attendeeKind: registrant.attendee_kind,
        registrationId: registrant.registration_id,
        publicRegistrationId: registrant.public_registration_id,
        attendanceAnswers: buildAttendanceAnswerSummaries(fields, answers),
      });

      toast.success(`Attendance data saved for ${registrant.full_name}.`);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save attendance data. Please try again.';
      toast.error(message);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg">
      <div className="overflow-visible">
        <div className="border-b border-border pb-4 mb-4">
          <h2 className="font-heading text-lg font-semibold text-text">
            Attendance Data: {registrant.full_name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {registrant.member_id && (
              <span className="mr-3">Member ID: {registrant.member_id}</span>
            )}
            {registrant.attendee_kind === 'public' && (
              <span className="mr-3">Attendee Type: Guest</span>
            )}
            {registrant.email && <span>{registrant.email}</span>}
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          {fields.map((field) => {
            const inputId = `field-${field.id}`;
            const isRequired = field.is_required;

            if (field.field_type === 'textarea') {
              return (
                <div key={field.id} className="space-y-1">
                  <label htmlFor={inputId} className="text-xs font-medium text-text">
                    {field.label}
                    {isRequired && <span className="ml-1 text-danger">*</span>}
                  </label>
                  <textarea
                    id={inputId}
                    {...register(field.id)}
                    rows={3}
                    required={isRequired}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              );
            }

            if (field.field_type === 'select' || field.field_type === 'radio') {
              return (
                <div key={field.id} className="space-y-1">
                  <label htmlFor={inputId} className="text-xs font-medium text-text">
                    {field.label}
                    {isRequired && <span className="ml-1 text-danger">*</span>}
                  </label>
                  <FormSelectField
                    id={inputId}
                    ariaLabel={field.label}
                    value={
                      typeof formValues[field.id] === 'string'
                        ? (formValues[field.id] as string)
                        : ''
                    }
                    onChange={(nextValue) => setValue(field.id, nextValue)}
                    placeholder="— Select —"
                    options={(field.options ?? []).map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    }))}
                  />
                </div>
              );
            }

            if (field.field_type === 'multi_select') {
              const selectedValues = Array.isArray(formValues[field.id])
                ? (formValues[field.id] as string[])
                : [];

              return (
                <div key={field.id} className="space-y-1">
                  <label htmlFor={inputId} className="text-xs font-medium text-text">
                    {field.label}
                    {isRequired && <span className="ml-1 text-danger">*</span>}
                  </label>
                  <FormMultiSelectDropdownField
                    triggerAriaLabel={field.label}
                    optionsAriaLabel={`${field.label} options`}
                    selectedLabel={getMultiSelectSelectedLabel(field)}
                    options={(field.options ?? []).map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    }))}
                    selectedValues={selectedValues}
                    isOpen={openMultiSelectFieldId === field.id}
                    clearButtonLabel="Clear selections"
                    emptyStateLabel="No options available"
                    onToggleDropdown={() =>
                      setOpenMultiSelectFieldId((current) =>
                        current === field.id ? null : field.id,
                      )
                    }
                    onCloseDropdown={() => setOpenMultiSelectFieldId(null)}
                    onClearSelection={() => {
                      setValue(field.id, [], { shouldDirty: true, shouldValidate: true });
                      setRequiredMultiSelectErrors((current) => {
                        if (!(field.id in current)) {
                          return current;
                        }

                        const nextErrors = { ...current };
                        delete nextErrors[field.id];
                        return nextErrors;
                      });
                    }}
                    onToggleSelection={(value) => handleToggleMultiSelectOption(field.id, value)}
                  />
                  {requiredMultiSelectErrors[field.id] && (
                    <p className="text-xs text-danger">Select at least one option.</p>
                  )}
                </div>
              );
            }

            if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
              return (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    id={inputId}
                    type="checkbox"
                    {...register(field.id)}
                    className="rounded border-border"
                  />
                  <label htmlFor={inputId} className="text-sm text-text">
                    {field.label}
                    {isRequired && <span className="ml-1 text-danger">*</span>}
                  </label>
                </div>
              );
            }

            const htmlType =
              field.field_type === 'number'
                ? 'number'
                : field.field_type === 'email'
                  ? 'email'
                  : field.field_type === 'date'
                    ? 'date'
                    : field.field_type === 'datetime'
                      ? 'datetime-local'
                      : field.field_type === 'color_picker'
                        ? 'color'
                        : 'text';

            return (
              <div key={field.id} className="space-y-1">
                <label htmlFor={inputId} className="text-xs font-medium text-text">
                  {field.label}
                  {isRequired && <span className="ml-1 text-danger">*</span>}
                </label>
                <input
                  id={inputId}
                  type={htmlType}
                  {...register(field.id)}
                  required={isRequired}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            );
          })}

          {fields.length === 0 && (
            <p className="text-sm text-muted">No attendance fields configured for this event.</p>
          )}

          <div className="flex justify-end gap-3 border-t border-border mt-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={upsertMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={upsertMutation.isPending || fields.length === 0}>
              {upsertMutation.isPending ? 'Saving…' : 'Save Data'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
