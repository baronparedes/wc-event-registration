import type { AttendanceFieldType } from '@/lib/domain/attendance-fields';
import type { EventFieldType } from '@/lib/domain/event-fields';

export type AttendeeKind = 'registered' | 'public';

export type CheckInStatus = 'checked_in' | 'already_checked_in' | 'rejected';

export type AttendanceSettings = {
  event_id: string;
  attendance_enabled: boolean;
  timeslot_enabled: boolean;
  enforce_check_in_event_window: boolean;
  timeslots: string[];
  updated_at: string;
};

export type CheckInResult = {
  success: boolean;
  status: CheckInStatus;
  official_check_in_time: string | null;
  attendee_kind: AttendeeKind;
  message: string;
};

export type AttendanceSlotPayload = {
  slot: string;
};

export type TimeslotAttendanceRecord = {
  event_id: string;
  attendee_ref: string;
  slot: string;
  recorded_at: string;
};

export type AttendanceSlotAttendee = {
  check_in_id: string;
  attendee_kind: 'registered' | 'public';
  registration_id: string | null;
  public_registration_id: string | null;
  full_name: string;
  member_id: string | null;
  email: string | null;
  official_check_in_time: string | null;
  recorded_at: string;
};

export type AttendanceSlotSummary = {
  slot: string;
  count: number;
  attendees: AttendanceSlotAttendee[];
};

export type AttendanceAnswer = {
  id: string;
  registration_id: string | null;
  public_registration_id: string | null;
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  created_at: string;
  updated_at: string;
};

export type RegistrantAttendanceRow = {
  attendee_kind: 'registered' | 'public';
  registration_id: string | null;
  public_registration_id: string | null;
  member_id: string | null;
  full_name: string;
  email: string | null;
  answers: AttendanceAnswer[];
};

export type AttendanceAnswerSummary = {
  attendance_field_id: string;
  field_type: AttendanceFieldType;
  field_key: string;
  label: string;
  answer_text: string | null;
  answer_number: number | null;
};

export type RegistrationAnswerSummary = {
  event_field_id: string;
  field_type: EventFieldType;
  field_key: string;
  label: string;
  answer_text: string | null;
  answer_number: number | null;
};

export type AttendeeSearchResult = {
  attendee_kind: 'registered' | 'public';
  registration_id: string;
  public_registration_id: string | null;
  user_id: string | null;
  member_id: string | null;
  full_name: string;
  email: string | null;
  role: string | null;
  category: string | null;
  registration_status: 'submitted' | 'updated' | 'cancelled';
  submitted_at: string;
  check_in_status: 'checked_in' | 'not_checked_in';
  official_check_in_time: string | null;
  registration_answers: RegistrationAnswerSummary[];
  attendance_answers: AttendanceAnswerSummary[];
};

export type SearchAttendeesInput = {
  event_id: string;
  search_token: string;
};

export type CheckInAttendeeInput = {
  event_id: string;
  attendee_kind: 'registered' | 'public';
  registration_id?: string;
  public_registration_id?: string;
  slot?: string;
};

export type UnregisteredMember = {
  user_id: string;
  member_id: string | null;
  full_name: string;
  email: string | null;
  role: string | null;
  category: string | null;
};

export type UnregisteredMembersReportInput = {
  event_id: string;
  page_size: number;
  offset: number;
  search_term?: string;
};
