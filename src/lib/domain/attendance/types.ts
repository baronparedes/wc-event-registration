export type AttendeeKind = 'registered' | 'walk_in';

export type CheckInStatus = 'checked_in' | 'already_checked_in' | 'rejected';

export type AttendanceSettings = {
  event_id: string;
  attendance_enabled: boolean;
  walk_in_mode_enabled: boolean;
  timeslot_enabled: boolean;
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

export type WalkInPayload = {
  full_name: string;
  email: string | null;
  phone: string | null;
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

export type AttendanceAnswer = {
  id: string;
  registration_id: string;
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  created_at: string;
  updated_at: string;
};

export type RegistrantAttendanceRow = {
  registration_id: string;
  member_id: string;
  full_name: string;
  email: string | null;
  answers: AttendanceAnswer[];
};
