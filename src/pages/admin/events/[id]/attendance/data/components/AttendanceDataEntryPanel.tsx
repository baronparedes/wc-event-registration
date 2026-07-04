import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { useUpsertAttendanceAnswersMutation } from '@/hooks/domain/attendance';
import type { AttendanceAnswer, RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';

type AttendanceDataEntryPanelProps = {
  eventId: string;
  registrant: RegistrantAttendanceRow;
  fields: AttendanceField[];
  onClose: () => void;
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

/** Panel for entering attendance field answers for a single registrant. */
export function AttendanceDataEntryPanel({
  eventId,
  registrant,
  fields,
  onClose,
}: AttendanceDataEntryPanelProps) {
  const upsertMutation = useUpsertAttendanceAnswersMutation();

  const defaultValues: AnswerFormValues = {};
  for (const field of fields) {
    defaultValues[field.id] = getExistingAnswerValue(
      registrant.answers,
      field.id,
      field.field_type,
    );
  }

  const { register, handleSubmit } = useForm<AnswerFormValues>({ defaultValues });

  async function onSubmit(values: AnswerFormValues) {
    try {
      const answers = fields.map((field) => {
        const rawValue = values[field.id] ?? '';

        if (field.field_type === 'number') {
          const parsedValue = Array.isArray(rawValue) ? (rawValue[0] ?? '') : rawValue;
          const num = parsedValue.trim() === '' ? null : Number(parsedValue);

          return {
            attendance_field_id: field.id,
            answer_text: null as string | null,
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
            answer_number: null as number | null,
          };
        }

        const parsedValue = Array.isArray(rawValue) ? (rawValue[0] ?? '') : rawValue;

        return {
          attendance_field_id: field.id,
          answer_text: parsedValue.trim().length > 0 ? parsedValue.trim() : (null as string | null),
          answer_number: null as number | null,
        };
      });

      await upsertMutation.mutateAsync({
        event_id: eventId,
        attendee_kind: registrant.attendee_kind,
        registration_id: registrant.registration_id ?? undefined,
        public_registration_id: registrant.public_registration_id ?? undefined,
        answers,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-y-auto rounded-2xl bg-surface shadow-xl">
        <div className="border-b border-border px-6 py-4">
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

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 px-6 py-4">
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
                  <select
                    id={inputId}
                    {...register(field.id)}
                    required={isRequired}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">— Select —</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.field_type === 'multi_select') {
              return (
                <div key={field.id} className="space-y-1">
                  <label htmlFor={inputId} className="text-xs font-medium text-text">
                    {field.label}
                    {isRequired && <span className="ml-1 text-danger">*</span>}
                  </label>
                  <select
                    id={inputId}
                    multiple
                    {...register(field.id)}
                    required={isRequired}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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

          <div className="flex justify-end gap-3 border-t border-border pt-4">
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
    </div>
  );
}
