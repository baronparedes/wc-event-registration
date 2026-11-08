import { z } from '@/shared/validation.ts';

export const pipelineTransactionSchema = z.object({
  step_number: z.number().int().min(1).max(9),
  step_key: z.enum([
    'register',
    'interview',
    'orientation',
    'observation',
    'evaluation',
    'onboarding',
    'vmt_registration',
    'rfid_releasing',
    'deployment',
  ]),
  attempt_number: z.number().int().positive().default(1),
  transaction_type: z
    .enum([
      'scheduled',
      'rescheduled',
      'completed',
      'repeated_step',
      'returned_to_observation',
      'skipped',
      'on_hold',
      'declined',
    ])
    .default('completed'),
  status: z
    .enum(['locked', 'pending', 'scheduled', 'in_progress', 'completed', 'skipped', 'declined'])
    .default('completed'),
  scheduled_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const importRowSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  first_name: z.string().trim().min(1, 'First name is required'),
  middle_name: z.string().trim().nullable().optional(),
  last_name: z.string().trim().min(1, 'Last name is required'),
  nickname: z.string().trim().min(1, 'Nickname is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(['Male', 'Female']),
  life_stage: z.string().trim().min(1, 'Life stage is required'),
  desired_role: z.enum(['Prayer Coach', 'Usher', 'Backroom Support', 'IMT Support', 'VMT Support']),
  confirmed_role: z
    .enum(['Prayer Coach', 'Usher', 'Backroom Support', 'IMT Support', 'VMT Support'])
    .nullable()
    .optional(),
  status: z.enum(['active', 'archived', 'on_hold', 'deployed', 'declined', 'withdrawn']),
  current_step: z.number().int().min(1).max(9),
  created_at: z.string().optional(),
  applicant_attested_at: z.string().optional(),
  personal_details: z.record(z.string(), z.unknown()).default({}),
  emergency_contact: z.record(z.string(), z.unknown()).default({}),
  application_history: z.record(z.string(), z.unknown()).default({}),
  spiritual_background: z.record(z.string(), z.unknown()).default({}),
  dgroup_info: z.record(z.string(), z.unknown()).default({}),
  is_endorsed: z.boolean().optional().default(false),
  transactions: z.array(pipelineTransactionSchema).optional().default([]),
});

export const requestSchema = z.object({
  rows: z.array(importRowSchema).min(1, 'rows must include at least one item'),
});

export type RequestPayload = z.infer<typeof requestSchema>;
export type ImportRow = z.infer<typeof importRowSchema>;
