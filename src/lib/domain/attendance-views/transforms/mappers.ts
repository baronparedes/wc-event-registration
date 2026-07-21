import type {
  AttendanceAnswer,
  AttendanceAnswerSummary,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
} from '@/lib/domain/attendance';

const NULL_ANSWER_DATE = '1970-01-01T00:00:00.000Z';

function toAttendanceAnswer(
  attendee: AttendeeSearchResult,
  answer: AttendanceAnswerSummary,
): AttendanceAnswer {
  const baseKey =
    attendee.attendee_kind === 'public'
      ? attendee.public_registration_id
      : attendee.registration_id;

  return {
    id: `${baseKey ?? attendee.registration_id}:${answer.attendance_field_id}`,
    registration_id: attendee.attendee_kind === 'public' ? null : attendee.registration_id,
    public_registration_id:
      attendee.attendee_kind === 'public' ? attendee.public_registration_id : null,
    attendance_field_id: answer.attendance_field_id,
    answer_text: answer.answer_text,
    answer_number: answer.answer_number,
    created_at: NULL_ANSWER_DATE,
    updated_at: NULL_ANSWER_DATE,
  };
}

export function attendeeToRegistrant(attendee: AttendeeSearchResult): RegistrantAttendanceRow {
  return {
    attendee_kind: attendee.attendee_kind,
    registration_id: attendee.attendee_kind === 'public' ? null : attendee.registration_id,
    public_registration_id:
      attendee.attendee_kind === 'public' ? attendee.public_registration_id : null,
    member_id: attendee.member_id,
    full_name: attendee.full_name,
    email: attendee.email,
    role: attendee.role,
    category: attendee.category,
    check_in_status: attendee.check_in_status,
    answers: attendee.attendance_answers.map((answer) => toAttendanceAnswer(attendee, answer)),
  };
}
