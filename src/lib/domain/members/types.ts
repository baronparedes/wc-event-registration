export type MemberLookupProfile = {
  member_token: string;
  role: string;
  first_name: string | null;
  last_initial: string | null;
  avatar_object_key?: string | null;
  user_id?: string;
  category?: string;
  full_name?: string;
  nickname?: string | null;
  last_name?: string | null;
};

export type ExistingRegistrationState = {
  exists: boolean;
  edit_allowed: boolean;
  status: 'submitted' | 'updated' | 'cancelled';
  responses: Record<string, unknown>;
};

export type MemberLookupResult = {
  profile: MemberLookupProfile | null;
  existing_registration: ExistingRegistrationState | null;
};

export type MemberEventHistoryAttendanceAnswer = {
  attendance_field_id: string;
  field_type: string;
  field_key: string;
  label: string;
  answer_text: string | null;
  answer_number: number | null;
};

export type MemberEventHistoryRegistrationAnswer = {
  event_field_id: string;
  field_type: string;
  field_key: string;
  label: string;
  answer_text: string | null;
  answer_number: number | null;
};

export type MemberEventHistorySlotRecord = {
  slot: string;
  recorded_at: string;
};

export type MemberEventHistoryItem = {
  event_id: string;
  event_title: string;
  event_slug: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  registration_id: string;
  registration_status: 'submitted' | 'updated' | 'cancelled';
  submitted_at: string | null;
  check_in_status: 'checked_in' | 'not_checked_in';
  official_check_in_time: string | null;
  attendance_enabled: boolean;
  registration_answers: MemberEventHistoryRegistrationAnswer[];
  attendance_answers: MemberEventHistoryAttendanceAnswer[];
  slot_records: MemberEventHistorySlotRecord[];
};

export type AdminMember = {
  id: string;
  member_id: string;
  avatar_object_key: string | null;
  is_active: boolean;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  role: string;
  category: string;
  extra_metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
};
