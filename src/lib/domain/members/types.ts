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

export type ExistingSubmissionState = ExistingRegistrationState;

export type MemberLookupResult = {
  profile: MemberLookupProfile | null;
  existing_registration: ExistingRegistrationState | null;
  existing_submission: ExistingSubmissionState | null;
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

export type MemberNote = {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  created_at: string;
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
  last_activity?: string;
  has_account?: boolean;
  notes: MemberNote[];
};

export type GoogleMemberSyncStage =
  | 'fetching_sheet'
  | 'parsing_rows'
  | 'loading_members'
  | 'resolving_rows'
  | 'upserting_batches';

export type GoogleMemberSyncProgress = {
  stage: GoogleMemberSyncStage;
  message: string;
  percent: number;
  total_sheet_rows?: number;
  parsed_rows?: number;
  resolved_rows?: number;
  processed_rows?: number;
  total_batches?: number;
  current_batch?: number;
  inserted_count?: number;
  updated_count?: number;
  skipped_count?: number;
};

export type GoogleMemberSyncSkippedRow = {
  row_number: number;
  member_id: string;
  reasons: string[];
};

export type GoogleMemberSyncResult = {
  dry_run?: false;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  total_sheet_rows: number;
  errors: string[];
  skipped_rows: GoogleMemberSyncSkippedRow[];
  timestamp: string;
};

export type GoogleMemberSyncPreviewSummary = {
  total_rows: number;
  insert_count: number;
  update_count: number;
  update_member_id_count: number;
  unchanged_count: number;
  error_count: number;
};

export type GoogleMemberSyncPreviewResult = {
  dry_run: true;
  total_sheet_rows: number;
  skipped_count: number;
  summary: GoogleMemberSyncPreviewSummary;
  preview_rows: import('./csv-import').MemberCsvPreviewRow[];
  errors: string[];
  skipped_rows: GoogleMemberSyncSkippedRow[];
  timestamp: string;
};

export type GoogleMemberSyncStreamEvent =
  | ({ type: 'progress' } & GoogleMemberSyncProgress)
  | { type: 'complete'; result: GoogleMemberSyncResult }
  | { type: 'error'; message: string };

export type GoogleMemberSyncPreviewStreamEvent =
  | ({ type: 'progress' } & GoogleMemberSyncProgress)
  | { type: 'complete'; result: GoogleMemberSyncPreviewResult }
  | { type: 'error'; message: string };
