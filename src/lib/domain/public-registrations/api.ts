import { supabase } from '@/lib/infrastructure';

import type { PublicRegistrationSummary } from './types';

export interface PublicRegistrationDetailJoinedAnswer {
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

export interface PublicRegistrationDetailRow {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  email: string;
  phone: string | null;
  status: string;
  submitted_at: string;
  updated_at: string;
  public_registration_answers: PublicRegistrationDetailJoinedAnswer[] | null;
}

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export async function fetchEventPublicRegistrationsPage(params: {
  eventId: string;
  offset: number;
  pageSize: number;
  searchTerm?: string;
}): Promise<{ rows: PublicRegistrationSummary[]; count: number | null }> {
  const { eventId, offset, pageSize, searchTerm } = params;
  let query = supabase
    .from('public_registrations')
    .select('id, first_name, last_name, nickname, email, phone, status, submitted_at', {
      count: 'exact',
    })
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (searchTerm && searchTerm.length > 0) {
    const escapedSearchTerm = escapeOrFilterValue(searchTerm);
    query = query.or(
      `first_name.ilike.%${escapedSearchTerm}%,last_name.ilike.%${escapedSearchTerm}%,nickname.ilike.%${escapedSearchTerm}%,email.ilike.%${escapedSearchTerm}%`,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return { rows: (data ?? []) as PublicRegistrationSummary[], count };
}

export async function fetchPublicRegistrationDetailRow(
  registrationId: string,
): Promise<PublicRegistrationDetailRow> {
  const { data: registration, error: registrationError } = await supabase
    .from('public_registrations')
    .select(
      'id, event_id, first_name, last_name, nickname, email, phone, status, submitted_at, updated_at, public_registration_answers(id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json, event_fields(id, field_key, label, field_type, display_order))',
    )
    .eq('id', registrationId)
    .single();

  if (registrationError || !registration) {
    throw new Error('Public registration not found');
  }

  return registration as unknown as PublicRegistrationDetailRow;
}
