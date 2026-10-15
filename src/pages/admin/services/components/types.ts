import type { FilterMode } from '../constants';

export interface GroupedMissedCommitment {
  service_date: string;
  time_slot: string;
  status: 'absent' | 'excused';
  role: string;
}

export interface GroupedVolunteer {
  user_id: string;
  member_id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  avatar_object_key: string | null;
  category?: string | null;
  roles: string[];
  commitments: GroupedMissedCommitment[];
  totalAbsent: number;
  totalExcused: number;
}

export interface MissedCommitmentsViewProps {
  volunteers: GroupedVolunteer[];
  filterMode: FilterMode;
}
