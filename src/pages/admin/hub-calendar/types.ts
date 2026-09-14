import type { MemberScheduleEntry, SundayKey } from '@/hooks/domain/members';
import { type AdminMember } from '@/lib/domain/members';

export type MilestoneType = 'birthday' | 'wedding_anniversary';

export type MilestoneEntry = {
  id: string;
  type: MilestoneType;
  member: AdminMember;
};

export type CalendarCell = {
  dayNumber: number | null;
  monthDayKey: string | null;
  isCurrentMonth: boolean;
  isSunday: boolean;
  sundayKey: SundayKey | null;
};

export type WeekCell = {
  date: Date;
  monthDayKey: string;
  scheduleEntries: MemberScheduleEntry[];
  milestoneEntries: MilestoneEntry[];
  isSunday: boolean;
  sundayKey: SundayKey | null;
};
