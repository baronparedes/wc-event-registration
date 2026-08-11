import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { MemberEventHistoryItem } from '@/lib/domain/members';
import { supabase } from '@/lib/infrastructure';

export const MEMBER_EVENT_HISTORY_QUERY_KEY = (userId: string) =>
  ['member-event-history', userId] as const;

const answerFieldSchema = z.object({
  field_type: z.string(),
  field_key: z.string(),
  label: z.string(),
  answer_text: z.string().nullable(),
  answer_number: z.number().nullable(),
});

const historyItemSchema = z.object({
  event_id: z.string(),
  event_title: z.string(),
  event_slug: z.string(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  location: z.string().nullable(),
  registration_id: z.string(),
  registration_status: z.enum(['submitted', 'updated', 'cancelled']),
  submitted_at: z.string().nullable(),
  check_in_status: z.enum(['checked_in', 'not_checked_in']),
  official_check_in_time: z.string().nullable(),
  attendance_enabled: z.boolean(),
  registration_answers: z.array(answerFieldSchema.extend({ event_field_id: z.string() })),
  attendance_answers: z.array(answerFieldSchema.extend({ attendance_field_id: z.string() })),
  slot_records: z.array(
    z.object({
      slot: z.string(),
      recorded_at: z.string(),
    }),
  ),
});

export function useMemberEventHistoryQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? MEMBER_EVENT_HISTORY_QUERY_KEY(userId) : ['member-event-history', 'missing'],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MemberEventHistoryItem[]> => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase.rpc('get_member_event_history', {
        p_user_id: userId,
      });

      if (error) throw error;

      return z.array(historyItemSchema).parse(data ?? []);
    },
  });
}
