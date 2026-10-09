import { createEdgeFunctionCaller, supabase } from '@/lib/infrastructure';

import type { AdminEvent, DuplicatePolicy, EventStatus, RegistrationMode } from './types';

export type DuplicateEventInput = {
  source_event_id: string;
  new_title: string;
  new_slug: string;
};

const callDuplicateEvent = createEdgeFunctionCaller<
  DuplicateEventInput,
  { success: boolean; new_event_id?: string; error?: string }
>('duplicate-event');

export type EventInsertPayload = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  status: EventStatus;
  duplicate_policy: DuplicatePolicy;
  registration_mode: RegistrationMode;
  allow_public_registrations: boolean;
  require_id_lookup: boolean;
  cover_image_key?: string | null;
  metadata: Record<string, unknown>;
  created_by_admin_id: string | null;
};

export type EventUpdateSnapshotRow = Pick<
  AdminEvent,
  | 'title'
  | 'description'
  | 'location'
  | 'starts_at'
  | 'ends_at'
  | 'registration_opens_at'
  | 'registration_closes_at'
  | 'status'
  | 'duplicate_policy'
  | 'registration_mode'
  | 'allow_public_registrations'
  | 'require_id_lookup'
  | 'cover_image_key'
  | 'metadata'
>;

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export async function fetchAdminEventsPage(params: {
  offset: number;
  pageSize: number;
  searchTerm: string;
}): Promise<{ rows: AdminEvent[]; count: number | null }> {
  const { offset, pageSize, searchTerm } = params;
  let eventsQuery = supabase
    .from('events')
    .select('*, member_registration_count, public_registration_count', { count: 'exact' });

  if (searchTerm.length > 0) {
    const escapedSearchTerm = escapeOrFilterValue(searchTerm);
    eventsQuery = eventsQuery.or(
      `title.ilike.%${escapedSearchTerm}%,slug.ilike.%${escapedSearchTerm}%`,
    );
  }

  const { data, error, count } = await eventsQuery
    .order('starts_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { rows: (data ?? []) as AdminEvent[], count };
}

export async function fetchAdminEventById(id: string): Promise<AdminEvent | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return data as AdminEvent | null;
}

export async function fetchEventForPublish(id: string): Promise<AdminEvent | null> {
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;
  return event as AdminEvent | null;
}

export async function updateEventStatus(id: string, status: EventStatus): Promise<void> {
  const { error } = await supabase.from('events').update({ status }).eq('id', id);

  if (error) throw error;
}

export async function fetchAdminIdByAuthUserId(authUserId: string): Promise<string | null> {
  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  return (adminRow?.id as string | undefined) ?? null;
}

export async function createEvent(payload: EventInsertPayload): Promise<string> {
  const { data, error } = await supabase.from('events').insert(payload).select('id').single();

  if (error) throw error;

  return data.id as string;
}

export async function fetchEventUpdateSnapshot(id: string): Promise<EventUpdateSnapshotRow | null> {
  const { data: previousEvent } = await supabase
    .from('events')
    .select(
      'title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at, status, duplicate_policy, registration_mode, allow_public_registrations, require_id_lookup, cover_image_key, metadata',
    )
    .eq('id', id)
    .maybeSingle();
  return previousEvent as EventUpdateSnapshotRow | null;
}

export async function updateEvent(id: string, values: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('events').update(values).eq('id', id);

  if (error) throw error;
}

export async function duplicateEvent(input: DuplicateEventInput): Promise<string> {
  const data = await callDuplicateEvent(input);

  if (!data || !data.success || !data.new_event_id) {
    throw new Error(data?.error || 'Failed to duplicate event');
  }

  return data.new_event_id;
}

export const EVENT_COVERS_BUCKET = 'event_covers';

export function getEventCoverPublicUrl(coverImageKey: string | null | undefined): string | null {
  if (!coverImageKey) return null;
  const { data } = supabase.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(coverImageKey);
  return data?.publicUrl ?? null;
}

export async function uploadEventCoverImage(file: File, eventIdOrSlug?: string): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const prefix = eventIdOrSlug ? `${eventIdOrSlug.replace(/[^a-zA-Z0-9_-]/g, '_')}-` : '';
  const fileName = `${prefix}${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  const { error } = await supabase.storage.from(EVENT_COVERS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) throw error;
  return filePath;
}

export async function deleteEventCoverImage(coverImageKey: string): Promise<void> {
  const { error } = await supabase.storage.from(EVENT_COVERS_BUCKET).remove([coverImageKey]);

  if (error) throw error;
}
