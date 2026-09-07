import type {
  CreateServiceAttendanceInput,
  CreateServiceLayoutInput,
  CreateServiceSeatInput,
  ServiceAttendance,
  ServiceLayout,
  ServiceSeat,
  UpdateServiceAttendanceInput,
  UpdateServiceLayoutInput,
  UpdateServiceSeatInput,
} from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure/supabase';

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

export interface FetchServiceAttendanceFilters {
  service_date?: string;
  time_slot?: string;
  user_id?: string;
  rfid?: string;
}

export async function fetchServiceAttendance(
  filters: FetchServiceAttendanceFilters = {},
): Promise<ServiceAttendance[]> {
  let query = supabase
    .from('service_attendance')
    .select('*')
    .order('checked_in_at', { ascending: false });

  if (filters.service_date) {
    query = query.eq('service_date', filters.service_date);
  }
  if (filters.time_slot) {
    query = query.eq('time_slot', filters.time_slot);
  }
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.rfid) {
    query = query.eq('rfid', filters.rfid);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch service attendance: ${error.message}`);
  }

  return (data as ServiceAttendance[]) ?? [];
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
