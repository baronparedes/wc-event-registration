import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { type MemberFormSubmissionItem, fetchMemberFormSubmissions } from '@/lib/domain/forms';

export const MEMBER_FORM_SUBMISSIONS_QUERY_KEY = (userId: string) =>
  ['member-form-submissions', userId] as const;

const approvalItemSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  title: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  assigned_to_email: z.string().nullable(),
  decided_by_email: z.string().nullable(),
  decided_at: z.string().nullable(),
  decision_notes: z.string().nullable(),
  field_label: z.string().nullable(),
  field_key: z.string().nullable(),
});

const answerItemSchema = z.object({
  id: z.string(),
  form_field_id: z.string(),
  field_key: z.string(),
  label: z.string(),
  field_type: z.string(),
  answer_text: z.string().nullable(),
  answer_number: z.number().nullable(),
});

const memberFormSubmissionItemSchema = z.object({
  submission_id: z.string(),
  form_id: z.string(),
  form_title: z.string(),
  form_slug: z.string(),
  form_description: z.string().nullable(),
  status: z.enum(['submitted', 'pending_approval', 'approved', 'rejected', 'cancelled']),
  submitted_at: z.string(),
  updated_at: z.string(),
  answers: z.array(answerItemSchema),
  approval_requests: z.array(approvalItemSchema),
});

export function useMemberFormSubmissionsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId
      ? MEMBER_FORM_SUBMISSIONS_QUERY_KEY(userId)
      : ['member-form-submissions', 'missing'],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MemberFormSubmissionItem[]> => {
      if (!userId) throw new Error('User ID is required');

      const data = await fetchMemberFormSubmissions(userId);

      return z.array(memberFormSubmissionItemSchema).parse(data ?? []);
    },
  });
}
