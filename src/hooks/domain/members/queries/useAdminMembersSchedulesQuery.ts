import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { type AdminMember, fetchActiveMembers } from '@/lib/domain/members';

const SUNDAY_KEYS = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
] as const;

export type TimeSlot = '9AM' | '12NN' | '3PM';
export type SundayKey = (typeof SUNDAY_KEYS)[number];

export type MemberScheduleEntry = {
  member: AdminMember;
  sundayKey: SundayKey;
  timeSlots: TimeSlot[];
};

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Fetches active members and parses their Sunday schedule availability.
 */
export function useAdminMembersSchedulesQuery() {
  return useQuery({
    queryKey: ['admin-members-schedules'] as const,
    queryFn: async (): Promise<MemberScheduleEntry[]> => {
      const members = await fetchActiveMembers();

      const scheduleEntries: MemberScheduleEntry[] = [];

      for (const member of members ?? []) {
        const metadata = (member.metadata as Record<string, unknown> | null | undefined) ?? {};

        const extra_metadata: Record<string, string> = {};
        for (const [key, value] of Object.entries(metadata)) {
          if (typeof value === 'string') {
            extra_metadata[key] = value;
          }
        }

        const adminMember: AdminMember = {
          id: member.id,
          member_id: member.member_id,
          avatar_object_key:
            typeof member.avatar_object_key === 'string' ? member.avatar_object_key : null,
          is_active: member.is_active,
          full_name: member.full_name,
          first_name: member.first_name,
          last_name: member.last_name,
          nickname: member.nickname,
          email: member.email,
          phone: member.phone,
          date_of_birth: member.date_of_birth,
          role: readMetadataString(member.role),
          category: readMetadataString(member.category),
          extra_metadata,
          created_at: member.created_at,
          updated_at: member.updated_at,
        };

        for (const key of SUNDAY_KEYS) {
          if (typeof metadata[key] === 'string') {
            const times = metadata[key]
              .split(',')
              .map((t) => t.trim().toUpperCase())
              .map((t) => t.replace(' ', '')); // Normalize "9 AM" to "9AM"

            const timeSlots: TimeSlot[] = [];
            for (const time of times) {
              if (time === '9AM' || time === '12NN' || time === '3PM') {
                timeSlots.push(time);
              }
            }

            if (timeSlots.length > 0) {
              scheduleEntries.push({
                member: adminMember,
                sundayKey: key,
                timeSlots,
              });
            }
          }
        }
      }

      return scheduleEntries;
    },
    staleTime: QUERY_STALE_TIME_MS.oneDay,
  });
}
