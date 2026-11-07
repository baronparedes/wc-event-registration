import { z } from '../_shared/validation.ts';

const serviceSlots = ['9AM', '12NN', '3PM'] as const;

export const recruitmentStageActions = [
  'complete_vmt',
  'save_commitments',
  'resend_endorsement',
  'update_stage',
  'repeat_step',
  'return_to_observation',
  'return_to_interview',
  'archive_applicant',
  'restore_applicant',
  'add_note',
  'upload_avatar',
  'cancel_schedule',
] as const;

export const commitmentsSchema = z
  .object({
    first_sunday: z.array(z.enum(serviceSlots)).optional(),
    second_sunday: z.array(z.enum(serviceSlots)).optional(),
    third_sunday: z.array(z.enum(serviceSlots)).optional(),
    fourth_sunday: z.array(z.enum(serviceSlots)).optional(),
    fifth_sunday: z.array(z.enum(serviceSlots)).optional(),
  })
  .refine(
    (commitments) => Object.values(commitments).some((slots) => (slots?.length ?? 0) > 0),
    'Select at least one Sunday service slot',
  );

export const updateRecruitmentStageSchema = z
  .object({
    action: z.enum(recruitmentStageActions),
    application_id: z.string().uuid(),
    step_number: z.number().int().min(1).max(9).optional(),
    status: z
      .enum([
        'pending',
        'scheduled',
        'in_progress',
        'completed',
        'skipped',
        'declined',
        'on_hold',
        'archived',
      ])
      .optional(),
    scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
    assigned_reviewer_id: z.string().uuid().optional().nullable(),
    assigned_reviewer_name: z.string().trim().max(150).optional().nullable(),
    rubric_data: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
    confirmed_role: z
      .enum(['Prayer Coach', 'Usher', 'Backroom Support', 'IMT Support', 'VMT Support'])
      .optional(),
    ccf_vmt_id: z.string().trim().max(100).optional().nullable(),
    ccf_vmt_date: z.string().date().optional().nullable(),
    assigned_rfid_member_id: z.string().trim().max(100).optional().nullable(),
    service_commitments: commitmentsSchema.optional(),
    override_endorsement_gate: z.boolean().optional().default(false),
    image_base64: z.string().max(1_500_000, 'Image must be 1 MB or smaller').optional().nullable(),
  })
  .superRefine((request, context) => {
    if (request.action === 'upload_avatar' && !request.image_base64?.trim()) {
      context.addIssue({
        code: 'custom',
        message: 'image_base64 is required for upload_avatar',
        path: ['image_base64'],
      });
    }
    if (request.action === 'update_stage' && (!request.step_number || !request.status)) {
      context.addIssue({
        code: 'custom',
        message: 'step_number and status are required for update_stage',
        path: ['step_number'],
      });
    }
    if (
      request.action === 'repeat_step' &&
      request.step_number !== 2 &&
      request.step_number !== 4 &&
      request.step_number !== 5
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Only interview, observation, and evaluation can be repeated',
        path: ['step_number'],
      });
    }
    if (
      request.action === 'return_to_interview' &&
      request.step_number !== 2 &&
      request.step_number !== 3
    ) {
      context.addIssue({
        code: 'custom',
        message: 'return_to_interview must reference step 2 or 3',
        path: ['step_number'],
      });
    }
    if (
      request.action === 'return_to_observation' &&
      request.step_number !== 4 &&
      request.step_number !== 5
    ) {
      context.addIssue({
        code: 'custom',
        message: 'return_to_observation must reference step 4 or 5',
        path: ['step_number'],
      });
    }
    if (request.action === 'add_note' && (!request.step_number || !request.notes?.trim())) {
      context.addIssue({
        code: 'custom',
        message: 'step_number and notes are required for add_note',
        path: ['notes'],
      });
    }
    if (request.action === 'cancel_schedule') {
      if (!request.step_number || request.step_number < 2 || request.step_number > 6) {
        context.addIssue({
          code: 'custom',
          message: 'step_number between 2 and 6 is required for cancel_schedule',
          path: ['step_number'],
        });
      }
      if (!request.notes?.trim()) {
        context.addIssue({
          code: 'custom',
          message: 'notes (cancellation reason) is required for cancel_schedule',
          path: ['notes'],
        });
      }
    }
  });

export type UpdateRecruitmentStageRequest = z.infer<typeof updateRecruitmentStageSchema>;
export type RecruitmentStageAction = UpdateRecruitmentStageRequest['action'];

export const dgroupInfoSchema = z.object({ leader_email: z.string().email() });

export const completeVmtResultSchema = z.object({
  success: z.literal(true),
  application_id: z.string().uuid(),
  current_step: z.number().int(),
  vmt_registered: z.literal(true),
  already_completed: z.boolean(),
});
