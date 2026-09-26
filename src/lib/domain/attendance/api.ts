import type { AttendanceSavedView } from '@/lib/domain/attendance-views';
import { supabase } from '@/lib/infrastructure';

import type { AttendanceSettings, AttendeeKind } from './types';

export type AttendanceAnswerTable = 'attendance_answers' | 'public_attendance_answers';
export type AttendanceAnswerTargetColumn = 'registration_id' | 'public_registration_id';

export type AttendanceAnswerUpsertRow = {
  id: string;
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  registration_id?: string;
  public_registration_id?: string;
};

export type AttendanceSlotRecordRow = {
  check_in_id: string;
  slot: string;
  recorded_at: string;
};

export type AttendanceCheckInRow = {
  id: string;
  attendee_kind: AttendeeKind;
  registration_id: string | null;
  public_registration_id: string | null;
  first_checked_in_at: string | null;
};

export type AttendanceRegistrationUserRow = {
  id: string;
  user_id: string | null;
};

export type AttendanceUserProfileRow = {
  id: string;
  member_id: string | null;
  full_name: string | null;
  email: string | null;
};

export type AttendancePublicRegistrationProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export async function deleteAttendanceAnswers(
  targetTable: AttendanceAnswerTable,
  targetColumn: AttendanceAnswerTargetColumn,
  targetId: string,
  attendanceFieldIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from(targetTable)
    .delete()
    .eq(targetColumn, targetId)
    .in('attendance_field_id', attendanceFieldIds);

  if (deleteError) throw deleteError;
}

export async function upsertAttendanceAnswers(
  targetTable: AttendanceAnswerTable,
  rows: AttendanceAnswerUpsertRow[],
  onConflict: string,
): Promise<void> {
  const { error } = await supabase.from(targetTable).upsert(rows, {
    onConflict,
    ignoreDuplicates: false,
  });

  if (error) throw error;
}

export async function fetchAttendanceSlotRecords(
  eventId: string,
): Promise<AttendanceSlotRecordRow[] | null> {
  const { data: slotRecords, error: slotRecordsError } = await supabase
    .from('attendance_slot_records')
    .select('check_in_id, slot, recorded_at')
    .eq('event_id', eventId)
    .order('recorded_at', { ascending: true });

  if (slotRecordsError) throw slotRecordsError;
  return slotRecords as AttendanceSlotRecordRow[] | null;
}

export async function fetchAttendanceCheckInsByIds(
  checkInIds: string[],
): Promise<AttendanceCheckInRow[]> {
  const { data: checkIns, error: checkInsError } = await supabase
    .from('attendance_check_ins')
    .select('id, attendee_kind, registration_id, public_registration_id, first_checked_in_at')
    .in('id', checkInIds);

  if (checkInsError) throw checkInsError;
  return (checkIns ?? []) as AttendanceCheckInRow[];
}

export async function fetchAttendanceRegistrationUsers(
  registrationIds: string[],
): Promise<AttendanceRegistrationUserRow[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('id, user_id')
    .in('id', registrationIds);

  if (error) throw error;
  return (data ?? []) as AttendanceRegistrationUserRow[];
}

export async function fetchAttendanceUserProfiles(
  userIds: string[],
): Promise<AttendanceUserProfileRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, member_id, full_name, email')
    .in('id', userIds);

  if (error) throw error;
  return (data ?? []) as AttendanceUserProfileRow[];
}

export async function fetchAttendancePublicRegistrationProfiles(
  publicRegistrationIds: string[],
): Promise<AttendancePublicRegistrationProfileRow[]> {
  const { data, error } = await supabase
    .from('public_registrations')
    .select('id, first_name, last_name, email')
    .in('id', publicRegistrationIds);

  if (error) throw error;
  return (data ?? []) as AttendancePublicRegistrationProfileRow[];
}

export async function fetchAttendanceSavedView(viewId: string): Promise<AttendanceSavedView> {
  const { data, error } = await supabase
    .from('attendance_saved_views')
    .select('*')
    .eq('id', viewId)
    .single();

  if (error) throw error;

  return data as AttendanceSavedView;
}

export async function fetchAttendanceSavedViews(eventId: string): Promise<AttendanceSavedView[]> {
  const { data, error } = await supabase
    .from('attendance_saved_views')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []) as AttendanceSavedView[];
}

export async function fetchAttendanceSettings(eventId: string): Promise<AttendanceSettings | null> {
  const { data, error } = await supabase
    .from('attendance_settings')
    .select(
      'event_id, attendance_enabled, timeslot_enabled, enforce_check_in_event_window, timeslots, updated_at',
    )
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) throw error;
  return data as AttendanceSettings | null;
}
