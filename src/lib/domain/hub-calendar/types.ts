import type { MemberScheduleEntry, SundayKey, TimeSlot } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

export type ExcusedMemberMap = Map<string, Map<string, Set<TimeSlot>>>;

export type MilestoneType = 'birthday' | 'wedding_anniversary';

export type MilestoneEntry = {
  id: string;
  type: MilestoneType;
  member: AdminMember;
};

export type CalendarCell = {
  dayNumber: number | null;
  monthDayKey: string | null;
  isoDate?: string;
  isCurrentMonth: boolean;
  isSunday: boolean;
  sundayKey: SundayKey | null;
};

export type WeekRange = {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
};

export type WeekCell = {
  date: Date;
  monthDayKey: string;
  isoDate?: string;
  scheduleEntries: MemberScheduleEntry[];
  milestoneEntries: MilestoneEntry[];
  isSunday: boolean;
  sundayKey: SundayKey | null;
};
