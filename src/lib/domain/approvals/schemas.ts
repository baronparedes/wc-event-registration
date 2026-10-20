import { z } from 'zod';

export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export const approvalEntityTypeSchema = z.enum(['form_submission', 'service_excuse']);

export const submitApprovalDecisionSchema = z
  .object({
    token: z.string().trim().optional(),
    approval_id: z.string().uuid().optional(),
    decision: z.enum(['approved', 'rejected']),
    notes: z.string().trim().max(1000).optional().nullable(),
    reviewer_email: z.string().trim().email().optional().nullable(),
  })
  .refine((data) => Boolean(data.token || data.approval_id), {
    message: 'Either token or approval_id is required',
    path: ['token'],
  });

export type SubmitApprovalDecisionSchema = z.infer<typeof submitApprovalDecisionSchema>;
