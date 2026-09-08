export type ServiceLayout = {
  id: string;
  description: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ServiceSeat = {
  id: string;
  layout_id: string;
  table_number: string;
  area: string | null;
  seat_number: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ServiceAttendance = {
  id: string;
  user_id: string;
  rfid: string | null;
  service_date: string;
  time_slot: string;
  checked_in_at: string;
  is_walk_in: boolean;
  is_override: boolean;
  is_manual_entry: boolean;
  service_seat_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};
