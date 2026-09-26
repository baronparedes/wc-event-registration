import { supabase } from '@/lib/infrastructure';

export type MemberUserRow = {
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
  role: unknown;
  category: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type MemberUserListRow = MemberUserRow & {
  last_activity?: string | null;
};

export type MemberLatestServiceAttendanceRow = {
  checked_in_at: string;
};

export type MemberImportSnapshotRow = {
  id: string;
  member_id: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  is_active: boolean;
};

export type MemberMetadataRow = {
  metadata: Record<string, unknown> | null;
};

export type MemberUpdatePayload = {
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  role: string;
  category: string;
  metadata: Record<string, unknown>;
};

export type MemberStatusFilter = 'active' | 'deleted' | 'all';

const MEMBER_USER_SELECT =
  'id, member_id, avatar_object_key, is_active, full_name, first_name, last_name, nickname, email, phone, date_of_birth, role, category, metadata, created_at, updated_at';

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export async function fetchAdminMembersPage(params: {
  offset: number;
  pageSize: number;
  searchTerm: string;
  searchTokens: string[];
  statusFilter: MemberStatusFilter;
}): Promise<{ rows: MemberUserListRow[]; count: number | null }> {
  const { offset, pageSize, searchTerm, searchTokens, statusFilter } = params;
  let query = supabase
    .from('users')
    .select(
      'id, member_id, avatar_object_key, is_active, full_name, first_name, last_name, nickname, email, phone, date_of_birth, role, category, metadata, created_at, updated_at, last_activity',
      { count: 'exact' },
    );

  if (statusFilter === 'active') {
    query = query.eq('is_active', true);
  } else if (statusFilter === 'deleted') {
    query = query.eq('is_active', false);
  }

  query = query
    .order('full_name', { ascending: true })
    .order('member_id', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (searchTokens.length > 0) {
    const escapedSearchTerm = escapeOrFilterValue(searchTerm);
    const escapedTokenPattern = `%${searchTokens
      .map((token) => escapeOrFilterValue(token))
      .join('%')}%`;

    query = query.or(
      `first_name.ilike.%${escapedSearchTerm}%,last_name.ilike.%${escapedSearchTerm}%,nickname.ilike.%${escapedSearchTerm}%,member_id.ilike.%${escapedSearchTerm}%,full_name.ilike.${escapedTokenPattern},email.ilike.${escapedTokenPattern}`,
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { rows: (data ?? []) as MemberUserListRow[], count };
}

export async function fetchAdminMemberById(
  memberId: string,
  includeInactive: boolean,
): Promise<MemberUserRow | null> {
  let query = supabase.from('users').select(MEMBER_USER_SELECT).eq('id', memberId);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return (data ?? null) as MemberUserRow | null;
}

export async function fetchMemberByEmail(email: string): Promise<MemberUserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select(MEMBER_USER_SELECT)
    .ilike('email', email)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as MemberUserRow | null;
}

export async function fetchMemberLatestServiceAttendance(
  userId: string,
): Promise<MemberLatestServiceAttendanceRow | null> {
  const { data } = await supabase
    .from('service_attendance')
    .select('checked_in_at')
    .eq('user_id', userId)
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as MemberLatestServiceAttendanceRow | null;
}

export async function fetchActiveMembers(): Promise<MemberUserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select(MEMBER_USER_SELECT)
    .eq('is_active', true)
    .order('full_name', { ascending: true })
    .order('member_id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MemberUserRow[];
}

export async function fetchMembersImportSnapshot(): Promise<MemberImportSnapshotRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, member_id, first_name, last_name, nickname, is_active')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as MemberImportSnapshotRow[];
}

export async function fetchMemberEventHistory(userId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('get_member_event_history', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data as unknown;
}

export async function fetchMemberMetadata(id: string): Promise<MemberMetadataRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('metadata')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as MemberMetadataRow | null;
}

export async function updateMember(id: string, values: MemberUpdatePayload): Promise<void> {
  const { error } = await supabase.from('users').update(values).eq('id', id);

  if (error) throw error;
}

export async function setMemberActiveStatus(
  id: string,
  isActive: boolean,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('is_active', !isActive)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as { id: string } | null;
}
