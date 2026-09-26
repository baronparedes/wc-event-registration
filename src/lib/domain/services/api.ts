import { supabase } from '@/lib/infrastructure';

import type {
  CreateServiceAttendanceInput,
  CreateServiceLayoutInput,
  CreateServiceSeatInput,
  UpdateServiceAttendanceInput,
  UpdateServiceLayoutInput,
  UpdateServiceSeatInput,
} from './schemas';
import type {
  ServiceAttendance,
  ServiceExceptionDate,
  ServiceLayout,
  ServiceSeat,
  UserCommitmentSnapshot,
} from './types';

export type ServiceAttendancePageFilters = {
  start_date?: string;
  end_date?: string;
  time_slot?: string;
  is_walk_in?: boolean;
  is_override?: boolean;
  user_id?: string;
  rfid?: string;
};

export type ServiceUserByRfidRow = {
  id: string;
  member_id: string;
  full_name: string;
};

export type ServiceUserByNameRow = {
  id: string;
  member_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

export type ServiceDashboardStatsArgs = {
  p_year?: number;
  p_month?: number;
  p_sunday_date?: string;
};

export type CommitmentDashboardStatsRpcFilters = {
  start_date: string;
  end_date: string;
  excuse_event_id?: string | null;
  search_query?: string;
  role?: string;
  category?: string;
};

export type CommitmentDashboardStatsRawRow = Record<string, unknown>;

export type VolunteerAttendanceLogRpcFilters = {
  user_id: string;
  start_date: string;
  end_date: string;
  excuse_event_id?: string | null;
};

export async function fetchServiceLayouts(): Promise<ServiceLayout[]> {
  const { data, error } = await supabase
    .from('service_layouts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch service layouts: ${error.message}`);
  }

  return (data as ServiceLayout[]) ?? [];
}

export async function fetchActiveServiceLayout(): Promise<ServiceLayout | null> {
  const { data, error } = await supabase
    .from('service_layouts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active service layout: ${error.message}`);
  }

  return data as ServiceLayout | null;
}

export async function createServiceLayout(input: CreateServiceLayoutInput): Promise<ServiceLayout> {
  const { data, error } = await supabase
    .from('service_layouts')
    .insert({
      description: input.description,
      is_active: input.is_active ?? true,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create service layout: ${error.message}`);
  }

  return data as ServiceLayout;
}

export async function updateServiceLayout(
  id: string,
  input: UpdateServiceLayoutInput,
): Promise<ServiceLayout> {
  const { data, error } = await supabase
    .from('service_layouts')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service layout: ${error.message}`);
  }

  return data as ServiceLayout;
}

export async function fetchServiceSeats(layoutId: string): Promise<ServiceSeat[]> {
  const { data, error } = await supabase
    .from('service_seats')
    .select('*')
    .eq('layout_id', layoutId)
    .order('table_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch service seats: ${error.message}`);
  }

  return (data as ServiceSeat[]) ?? [];
}

export async function createServiceSeat(input: CreateServiceSeatInput): Promise<ServiceSeat> {
  const { data, error } = await supabase
    .from('service_seats')
    .insert({
      layout_id: input.layout_id,
      table_number: input.table_number,
      area: input.area ?? null,
      seat_number: input.seat_number ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create service seat: ${error.message}`);
  }

  return data as ServiceSeat;
}

export async function updateServiceSeat(
  id: string,
  input: UpdateServiceSeatInput,
): Promise<ServiceSeat> {
  const { data, error } = await supabase
    .from('service_seats')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service seat: ${error.message}`);
  }

  return data as ServiceSeat;
}

export async function deleteServiceSeat(id: string): Promise<void> {
  const { error } = await supabase.from('service_seats').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete service seat: ${error.message}`);
  }
}

export async function fetchServiceAttendancePage(params: {
  offset: number;
  pageSize: number;
  filters: ServiceAttendancePageFilters;
}): Promise<{ rows: ServiceAttendance[]; count: number | null }> {
  const { offset, pageSize, filters } = params;
  let query = supabase
    .from('service_attendance')
    .select(
      `
          *,
          service_seats (
            id,
            table_number,
            seat_number,
            area
          ),
          user:users!service_attendance_user_id_fkey(
            member_id,
            full_name,
            nickname,
            avatar_object_key,
            role,
            category,
            is_active
          )
        `,
      { count: 'exact' },
    )
    .order('checked_in_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.start_date || filters.end_date) {
    const effectiveStart = filters.start_date ?? filters.end_date!;
    const effectiveEnd = filters.end_date ?? filters.start_date!;
    query = query.gte('service_date', effectiveStart).lte('service_date', effectiveEnd);
  }
  if (filters.time_slot) {
    query = query.eq('time_slot', filters.time_slot);
  }
  if (filters.is_walk_in !== undefined) {
    query = query.eq('is_walk_in', filters.is_walk_in);
  }
  if (filters.is_override !== undefined) {
    query = query.eq('is_override', filters.is_override);
  }
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.rfid) {
    query = query.eq('rfid', filters.rfid);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch service attendance: ${error.message}`);
  }

  return { rows: (data as ServiceAttendance[]) ?? [], count };
}

export async function recordServiceAttendance(
  input: CreateServiceAttendanceInput,
): Promise<ServiceAttendance> {
  const { data, error } = await supabase
    .from('service_attendance')
    .insert({
      user_id: input.user_id,
      rfid: input.rfid ?? null,
      service_date: input.service_date,
      time_slot: input.time_slot,
      checked_in_at: input.checked_in_at ?? new Date().toISOString(),
      is_walk_in: input.is_walk_in ?? false,
      is_override: input.is_override ?? false,
      is_manual_entry: input.is_manual_entry ?? false,
      service_seat_id: input.service_seat_id ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record service attendance: ${error.message}`);
  }

  return data as ServiceAttendance;
}

export async function updateServiceAttendance(
  id: string,
  input: UpdateServiceAttendanceInput,
): Promise<ServiceAttendance> {
  const { data, error } = await supabase
    .from('service_attendance')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service attendance: ${error.message}`);
  }

  return data as ServiceAttendance;
}

export async function deleteServiceAttendance(id: string): Promise<void> {
  const { error } = await supabase.from('service_attendance').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete service attendance record: ${error.message}`);
  }
}

export async function fetchServiceUsersByRfids(rfids: string[]): Promise<ServiceUserByRfidRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, member_id, full_name')
    .in('member_id', rfids);

  if (error) {
    throw error;
  }

  return (data ?? []) as ServiceUserByRfidRow[];
}

export async function fetchServiceUsersByNameFilter(
  orFilter: string,
): Promise<ServiceUserByNameRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, member_id, full_name, first_name, last_name, nickname')
    .or(orFilter);

  if (error) {
    throw error;
  }

  return (data ?? []) as ServiceUserByNameRow[];
}

export async function fetchUserCommitmentHistory(
  userId: string,
): Promise<UserCommitmentSnapshot[]> {
  const { data, error } = await supabase
    .from('user_commitment_history')
    .select('*')
    .eq('user_id', userId)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as UserCommitmentSnapshot[]) || [];
}

export async function fetchServiceDashboardStats(
  args: ServiceDashboardStatsArgs,
): Promise<unknown> {
  const { data, error } = await supabase.rpc('get_service_dashboard_stats', args);

  if (error) {
    throw new Error(`Failed to fetch service dashboard stats: ${error.message}`);
  }

  return data as unknown;
}

export async function fetchCommitmentDashboardStatsPage(
  filters: CommitmentDashboardStatsRpcFilters,
  page: number,
  pageSize: number,
): Promise<CommitmentDashboardStatsRawRow[]> {
  const { data, error } = await supabase.rpc('get_commitment_dashboard_stats', {
    p_start_date: filters.start_date,
    p_end_date: filters.end_date,
    p_excuse_event_id: filters.excuse_event_id || null,
    p_search_query: filters.search_query || null,
    p_role: filters.role || null,
    p_category: filters.category || null,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    throw new Error(`Failed to fetch commitment dashboard stats: ${error.message}`);
  }

  return (data ?? []) as CommitmentDashboardStatsRawRow[];
}

export async function fetchAllCommitmentDashboardStatsForExport(
  filters: CommitmentDashboardStatsRpcFilters,
  pageSize: number,
): Promise<CommitmentDashboardStatsRawRow[]> {
  const { data: firstPageData, error: firstPageError } = await supabase.rpc(
    'get_commitment_dashboard_stats',
    {
      p_start_date: filters.start_date,
      p_end_date: filters.end_date,
      p_excuse_event_id: filters.excuse_event_id || null,
      p_search_query: filters.search_query || null,
      p_role: filters.role || null,
      p_category: filters.category || null,
      p_page: 1,
      p_page_size: pageSize,
    },
  );

  if (firstPageError) {
    throw new Error(
      `Failed to fetch commitment dashboard stats for export: ${firstPageError.message}`,
    );
  }

  const rawFirstPageItems = (firstPageData ?? []) as CommitmentDashboardStatsRawRow[];
  const totalCount = rawFirstPageItems.length > 0 ? Number(rawFirstPageItems[0].total_count) : 0;

  const allRows: CommitmentDashboardStatsRawRow[] = [...rawFirstPageItems];

  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages > 1) {
    const remainingPagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      remainingPagePromises.push(
        supabase.rpc('get_commitment_dashboard_stats', {
          p_start_date: filters.start_date,
          p_end_date: filters.end_date,
          p_excuse_event_id: filters.excuse_event_id || null,
          p_search_query: filters.search_query || null,
          p_role: filters.role || null,
          p_category: filters.category || null,
          p_page: page,
          p_page_size: pageSize,
        }),
      );
    }

    const remainingResults = await Promise.all(remainingPagePromises);
    for (const res of remainingResults) {
      if (res.error) {
        throw new Error(
          `Failed to fetch commitment dashboard stats page for export: ${res.error.message}`,
        );
      }
      const rawItems = (res.data ?? []) as CommitmentDashboardStatsRawRow[];
      allRows.push(...rawItems);
    }
  }

  return allRows;
}

export async function fetchVolunteerAttendanceLog(
  filters: VolunteerAttendanceLogRpcFilters,
): Promise<unknown[]> {
  const { data, error } = await supabase.rpc('get_volunteer_attendance_log', {
    p_user_id: filters.user_id,
    p_start_date: filters.start_date,
    p_end_date: filters.end_date,
    p_excuse_event_id: filters.excuse_event_id || null,
  });

  if (error) {
    throw new Error(`Failed to fetch volunteer attendance log: ${error.message}`);
  }

  return (data || []) as unknown[];
}

export async function fetchServiceExceptionDates(): Promise<ServiceExceptionDate[]> {
  const { data, error } = await supabase
    .from('service_exception_dates')
    .select('*')
    .order('exception_date', { ascending: true });

  if (error) throw error;
  return (data as unknown as ServiceExceptionDate[]) || [];
}
