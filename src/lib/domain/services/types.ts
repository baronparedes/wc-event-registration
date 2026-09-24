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

export type ServiceAttendanceSeat = {
  id: string;
  table_number: string;
  area: string | null;
  seat_number: string | null;
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
  service_seats?: ServiceAttendanceSeat | null;
  user?: {
    member_id: string;
    full_name: string;
    nickname: string | null;
    avatar_object_key?: string | null;
  } | null;
};

export type UserCommitmentSnapshot = {
  id: string;
  user_id: string;
  effective_date: string;
  metadata: Record<string, string | null>;
  created_at: string;
};

export type CommitmentDashboardStat = {
  user_id: string;
  member_id: string;
  avatar_object_key: string | null;
  full_name: string;
  nickname: string;
  email: string;
  role: string;
  category: string;
  start_date: string;
  committed: number;
  attended: number;
  absences: number;
  excused: number;
  wi_9am_3pm: number;
  wi_12nn: number;
  attendance_score: number;
};
