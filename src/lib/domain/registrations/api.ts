import { supabase } from '@/lib/infrastructure';

import type { RegistrationStatus } from './types';

export type RegistrationAnswerCount = {
  count: number | null;
};

export type RegistrationListRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  submitted_at: string;
  updated_at: string | null;
  registration_answers?: RegistrationAnswerCount[] | null;
};

export type RegistrationMemberRow = {
  id: string;
  member_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role?: unknown;
  category?: unknown;
};

export interface RegistrationDetailJoinedUser {
  id: string;
  member_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  nickname: string | null;
  role?: unknown;
  category?: unknown;
}

export interface RegistrationDetailJoinedAnswer {
  id: string;
  event_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
  event_fields: {
    id: string;
    field_key: string;
    label: string;
    field_type: string;
    display_order: number;
  } | null;
}

export interface RegistrationDetailRow {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  submitted_at: string;
  updated_at: string | null;
  users: RegistrationDetailJoinedUser | RegistrationDetailJoinedUser[] | null;
  registration_answers: RegistrationDetailJoinedAnswer[] | null;
}

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export async function searchRegistrationUserIds(searchTerm: string): Promise<string[]> {
  const escapedSearchTerm = escapeOrFilterValue(searchTerm);
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .or(
      `full_name.ilike.%${escapedSearchTerm}%,member_id.ilike.%${escapedSearchTerm}%,email.ilike.%${escapedSearchTerm}%`,
    );
  if (error) throw error;
  return (data as { id: string }[] | null)?.map((u) => u.id) ?? [];
}

export async function fetchEventRegistrationsPage(params: {
  eventId: string;
  offset: number;
  pageSize: number;
  userIds?: string[];
}): Promise<{ rows: RegistrationListRow[]; count: number | null }> {
  const { eventId, offset, pageSize, userIds } = params;
  let registrationsQuery = supabase
    .from('registrations')
    .select(
      'id, event_id, user_id, status, submitted_at, updated_at, registration_answers(count)',
      { count: 'exact' },
    )
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (userIds) {
    registrationsQuery = registrationsQuery.in('user_id', userIds);
  }

  const { data, error, count } = await registrationsQuery;
  if (error) throw error;
  return { rows: (data ?? []) as RegistrationListRow[], count };
}

export async function fetchRegistrationMembersByIds(
  userIds: string[],
): Promise<RegistrationMemberRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, member_id, full_name, email, phone, role, category')
    .in('id', userIds);
  if (error) throw error;
  return (data ?? []) as RegistrationMemberRow[];
}

export async function fetchRegistrationDetail(
  registrationId: string,
): Promise<RegistrationDetailRow> {
  const { data, error } = await supabase
    .from('registrations')
    .select(
      `
          id, event_id, user_id, status, submitted_at, updated_at,
          users!inner(id, member_id, full_name, email, phone, nickname, role, category),
          registration_answers(
            id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json,
            event_fields(id, field_key, label, field_type, display_order)
          )
        `,
    )
    .eq('id', registrationId)
    .single();

  if (error || !data) {
    throw new Error('Registration not found');
  }

  return data as unknown as RegistrationDetailRow;
}
