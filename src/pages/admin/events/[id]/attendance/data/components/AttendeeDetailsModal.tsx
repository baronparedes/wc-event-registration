import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import type { AdminEventField } from '@/lib/domain/event-fields';

type RegistrationAnswerSummary = {
  event_field_id: string;
  field_type: string;
  label: string;
  answer_text: string | null;
  answer_number: number | null;
};

type AttendeeDetailsModalProps = {
  isOpen: boolean;
  registrant: RegistrantAttendanceRow | null;
  attendanceFields: AttendanceField[];
  registrationFields: AdminEventField[];
  registrationAnswers: RegistrationAnswerSummary[];
  onClose: () => void;
};

function getAnswerCardsItemClass(cardCount: number): string {
  if (cardCount <= 1) {
    return 'w-full';
  }

  if (cardCount === 2) {
    return 'w-full md:w-[calc(50%-0.375rem)]';
  }

  return 'w-full md:w-[calc(50%-0.375rem)] xl:w-[calc(33.333%-0.5rem)]';
}

function getFieldLabel(field: AttendanceField | AdminEventField): string {
  return field.label || field.field_key;
}

function getAnswerText(
  fieldType: string,
  answer: { answer_text: string | null; answer_number: number | null },
): string {
  if (answer.answer_number !== null) {
    return String(answer.answer_number);
  }

  if (!answer.answer_text) {
    return '—';
  }

  if (fieldType === 'multi_select') {
    try {
      const parsed = JSON.parse(answer.answer_text);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
    } catch {
      // Fall through to return answer_text as-is
    }
  }

  return answer.answer_text;
}

/** Modal for viewing attendee details in the attendance data page. */
export function AttendeeDetailsModal({
  isOpen,
  registrant,
  attendanceFields,
  registrationFields,
  registrationAnswers,
  onClose,
}: AttendeeDetailsModalProps) {
  if (!registrant) return null;

  const isCheckedIn = registrant.check_in_status === 'checked_in';

  // Group registration answers by field for display
  const registrationAnswersWithFields = registrationFields
    .map((field) => {
      const answer = registrationAnswers.find((a) => a.event_field_id === field.id);
      return { field, answer };
    })
    .filter(
      ({ answer }) => answer && (answer.answer_text !== null || answer.answer_number !== null),
    );

  // Group attendance answers by field for display
  const attendanceAnswersWithFields = attendanceFields
    .map((field) => {
      const answer = registrant.answers.find((a) => a.attendance_field_id === field.id);
      return { field, answer };
    })
    .filter(
      ({ answer }) => answer && (answer.answer_text !== null || answer.answer_number !== null),
    );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl lg:max-w-4xl">
      <div className="flex flex-col max-h-[80vh] lg:max-h-full lg:h-full">
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Header */}
          <div className="border-b border-border pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-text">
                  {registrant.full_name}
                </h2>
                <div className="mt-2 space-y-1 text-sm text-muted">
                  <p>Member ID: {registrant.member_id ?? 'Guest'}</p>
                  {registrant.email && <p>Email: {registrant.email}</p>}
                  {registrant.role && <p>Role: {registrant.role}</p>}
                  {registrant.category && <p>Category: {registrant.category}</p>}
                </div>
              </div>
              <div
                className={`rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm whitespace-nowrap ${
                  isCheckedIn
                    ? 'border-green-300 bg-green-100 text-green-900'
                    : 'border-slate-300 bg-slate-100 text-slate-900'
                }`}
              >
                {isCheckedIn ? 'Checked In' : 'Not Checked In'}
              </div>
            </div>
          </div>

          {/* Registration Answers */}
          {registrationAnswersWithFields.length > 0 && (
            <div className="rounded-xl border-2 border-secondary/30 bg-teal-50/70 p-5 shadow-sm mb-4">
              <p className="text-lg font-semibold text-text mb-4">Registration answers</p>
              <ul className="flex flex-wrap gap-3">
                {registrationAnswersWithFields.map(({ field, answer }) => {
                  if (!answer) return null;
                  const answerText = getAnswerText(answer.field_type, answer);
                  return (
                    <li
                      key={field.id}
                      className={`${getAnswerCardsItemClass(registrationAnswersWithFields.length)} rounded-xl border border-secondary/20 bg-surface p-4 shadow-xs`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {getFieldLabel(field)}
                      </p>
                      <p className="mt-2 break-words text-sm font-semibold text-text">
                        {answerText}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Attendance Answers */}
          {attendanceAnswersWithFields.length > 0 ? (
            <div className="rounded-xl border-2 border-primary/30 bg-blue-50/70 p-5 shadow-sm mb-4">
              <p className="text-lg font-semibold text-text mb-4">Attendance Data</p>
              <ul className="flex flex-wrap gap-3">
                {attendanceAnswersWithFields.map(({ field, answer }) => {
                  if (!answer) return null;
                  const answerText = getAnswerText(field.field_type, answer);
                  return (
                    <li
                      key={field.id}
                      className={`${getAnswerCardsItemClass(attendanceAnswersWithFields.length)} rounded-xl border border-primary/20 bg-surface p-4 shadow-xs`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {getFieldLabel(field)}
                      </p>
                      <p className="mt-2 break-words text-sm font-semibold text-text">
                        {answerText}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-primary/30 bg-blue-50/70 p-5 shadow-sm mb-4">
              <p className="text-base text-muted">No attendance data recorded yet.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-border px-4 py-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
