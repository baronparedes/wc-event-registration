import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';

import { RECRUITMENT_ROLES, RECRUITMENT_SERVICE_SLOTS } from './constants';

const monthYearPattern = /^\d{4} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timestampSchema = z.string().datetime({ offset: true });

const createDateSchema = (label = 'Date') =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .regex(datePattern, `${label} must be in YYYY-MM-DD format`)
    .refine((value) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }, `${label} is invalid`);

const dateSchema = createDateSchema('Date');
const dobSchema = createDateSchema('Date of birth');

const createMonthYearSchema = (label = 'Month and year') =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .regex(monthYearPattern, `${label} must use YYYY MMM format`);

const monthYearSchema = createMonthYearSchema('Month and year');
const ccfMemberSinceSchema = createMonthYearSchema('CCF Member Since date');
const dgroupMemberSinceSchema = createMonthYearSchema('DGroup Member Since date');

const createPhoneSchema = (label = 'Mobile number') =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .min(5, `${label} is too short`)
    .max(30, `${label} is too long`)
    .regex(VALIDATION_PATTERNS.phone, 'Invalid Philippine mobile number');

const phoneSchema = createPhoneSchema('Mobile number');
const emergencyPhoneSchema = createPhoneSchema('Emergency contact number');
const leaderPhoneSchema = createPhoneSchema('DGroup leader mobile number');

const dynamicFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  toggle_label: z.string().optional(),
  toggle_default: z.boolean().optional(),
});

const dynamicFieldSchema = z.object({
  id: z.string().optional(),
  field_key: z.string().trim().min(1),
  label: z.string(),
  field_type: z.enum([
    'text',
    'textarea',
    'number',
    'email',
    'phone',
    'select',
    'radio',
    'checkbox',
    'multi_select',
    'multi_select_toggle',
    'date',
    'datetime',
    'boolean',
    'color_picker',
    'rating',
    'required_approval',
  ]),
  is_required: z.boolean(),
  is_active: z.boolean().optional(),
  placeholder: z.string().nullable().optional(),
  help_text: z.string().nullable().optional(),
  options: z.array(dynamicFieldOptionSchema).optional(),
  validation_rules: z.record(z.string(), z.unknown()).optional(),
  display_order: z.number().int().optional(),
});

const surveyQuestionSchema = dynamicFieldSchema.extend({
  correct_answer: z.enum(['true', 'false']),
  explanation: z.string().optional(),
});

function hasActiveQuestion(questions: Array<{ is_active?: boolean }>): boolean {
  return questions.some((question) => question.is_active === true);
}

const surveyQuestionBankSchema = z
  .array(surveyQuestionSchema)
  .min(1)
  .refine(hasActiveQuestion, 'At least one survey question must be active');

const endorsementQuestionBankSchema = z
  .array(dynamicFieldSchema)
  .min(1)
  .refine(hasActiveQuestion, 'At least one endorsement question must be active');

const publicSurveyQuestionBankSchema = z
  .array(dynamicFieldSchema)
  .min(1)
  .refine(hasActiveQuestion, 'At least one survey question must be active');

const eligibilityRulesSchema = z
  .object({
    min_age: z.number().int().min(0),
    max_age: z.number().int().min(0),
    requires_glc1_completed: z.boolean(),
    min_dgroup_months: z.number().int().min(0),
  })
  .refine((rules) => rules.max_age >= rules.min_age, {
    message: 'Maximum age must be greater than or equal to minimum age',
    path: ['max_age'],
  });

const commitmentsShapeSchema = z.object({
  first_sunday: z.array(z.enum(RECRUITMENT_SERVICE_SLOTS)).optional(),
  second_sunday: z.array(z.enum(RECRUITMENT_SERVICE_SLOTS)).optional(),
  third_sunday: z.array(z.enum(RECRUITMENT_SERVICE_SLOTS)).optional(),
  fourth_sunday: z.array(z.enum(RECRUITMENT_SERVICE_SLOTS)).optional(),
  fifth_sunday: z.array(z.enum(RECRUITMENT_SERVICE_SLOTS)).optional(),
});

const recruitmentStepKeySchema = z.enum([
  'register',
  'interview',
  'orientation',
  'observation',
  'evaluation',
  'onboarding',
  'vmt_registration',
  'rfid_releasing',
  'deployment',
]);

const recruitmentStepNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
]);

const recruitmentApplicationStatusSchema = z.enum([
  'active',
  'archived',
  'on_hold',
  'deployed',
  'declined',
  'withdrawn',
]);

const recruitmentStageStatusSchema = z.enum([
  'locked',
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'skipped',
  'on_hold',
  'archived',
  'declined',
]);

export const recruitmentStep1Schema = z
  .object({
    email: z
      .string({ message: 'Email address is required' })
      .trim()
      .min(1, 'Email address is required')
      .email('Invalid email address')
      .toLowerCase(),
    first_name: z
      .string({ message: 'First name is required' })
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name must be at most 100 characters'),
    middle_name: z
      .string()
      .trim()
      .max(100, 'Middle name must be at most 100 characters')
      .optional()
      .nullable(),
    last_name: z
      .string({ message: 'Last name is required' })
      .trim()
      .min(1, 'Last name is required')
      .max(100, 'Last name must be at most 100 characters'),
    nickname: z
      .string({ message: 'Nickname is required' })
      .trim()
      .min(1, 'Nickname is required')
      .max(100, 'Nickname must be at most 100 characters'),
    phone: phoneSchema,
    date_of_birth: dobSchema,
    gender: z.enum(['Male', 'Female'], { message: 'Please select a gender' }),
    life_stage: z
      .string({ message: 'Please select a life stage' })
      .trim()
      .min(1, 'Please select a life stage')
      .max(100),
    avatar_image_base64: z.string().max(1_500_000).optional().nullable(),
    desired_role: z.enum(RECRUITMENT_ROLES, { message: 'Please select a desired role' }),
    personal_details: z.object({
      wedding_anniversary: dateSchema.optional().nullable(),
      occupation: z
        .string({ message: 'Occupation is required' })
        .trim()
        .min(1, 'Occupation is required')
        .max(150, 'Occupation must be at most 150 characters'),
      company_name: z
        .string()
        .trim()
        .max(150, 'Company name must be at most 150 characters')
        .optional()
        .nullable(),
    }),
    emergency_contact: z.object({
      name: z
        .string({ message: 'Emergency contact name is required' })
        .trim()
        .min(1, 'Emergency contact name is required')
        .max(150),
      phone: emergencyPhoneSchema,
      relation: z
        .string({ message: 'Relation to the applicant is required' })
        .trim()
        .min(1, 'Relation to the applicant is required')
        .max(100),
    }),
    application_history: z.object({
      is_first_time_applicant: z.boolean(),
      previous_application_notes: z.string().trim().max(2000).optional().nullable(),
    }),
    spiritual_background: z.object({
      ccf_member_since: ccfMemberSinceSchema,
      other_ministries: z.string().trim().max(1000).optional().nullable(),
      glc1_status: z.enum(['Completed', 'Ongoing', 'None'], {
        message: 'Please select your GLC 1 status',
      }),
      glc2_status: z
        .enum(['Completed', 'Ongoing', 'None'], {
          message: 'Please select your GLC 2 status',
        })
        .optional(),
    }),
    dgroup_info: z.object({
      is_constant_attendee: z.boolean({
        message: 'Please indicate if you are a constant DGroup attendee',
      }),
      member_since: dgroupMemberSinceSchema,
      leader_name: z
        .string({ message: 'DGroup leader name is required' })
        .trim()
        .min(1, 'DGroup leader name is required')
        .max(150),
      leader_email: z
        .string({ message: 'DGroup leader email is required' })
        .trim()
        .min(1, 'DGroup leader email is required')
        .email('Invalid email address')
        .toLowerCase(),
      leader_phone: leaderPhoneSchema,
      is_dgroup_leader: z.boolean(),
      leader_since: monthYearSchema.optional().nullable(),
      dgroup_member_count: z
        .number()
        .int()
        .positive('Member count must be positive')
        .optional()
        .nullable(),
    }),
    survey_answers: z.record(z.string(), z.enum(['true', 'false'])),
    applicant_attested: z.literal(true),
  })
  .superRefine((application, context) => {
    if (
      !application.application_history.is_first_time_applicant &&
      !application.application_history.previous_application_notes?.trim()
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Previous application details are required for returning applicants',
        path: ['application_history', 'previous_application_notes'],
      });
    }

    if (application.life_stage === 'Married' && !application.personal_details.wedding_anniversary) {
      context.addIssue({
        code: 'custom',
        message: 'Wedding anniversary is required for married applicants',
        path: ['personal_details', 'wedding_anniversary'],
      });
    }

    if (application.dgroup_info.is_dgroup_leader && !application.dgroup_info.leader_since) {
      context.addIssue({
        code: 'custom',
        message: 'DGroup Leader Since is required when the applicant is a DGroup leader.',
        path: ['dgroup_info', 'leader_since'],
      });
    }

    if (
      application.spiritual_background.glc1_status === 'Completed' &&
      !application.spiritual_background.glc2_status
    ) {
      context.addIssue({
        code: 'custom',
        message: 'GLC 2 Course Status is required when GLC 1 is completed.',
        path: ['spiritual_background', 'glc2_status'],
      });
    }
  });

export const dgroupEndorsementDecisionSchema = z.object({
  action: z.literal('submit_decision'),
  token: z.string().trim().min(1),
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().trim().max(1000).optional().nullable(),
  attestation_answers: z.record(z.string(), z.unknown()).optional(),
});

export const applicantCommitmentsSchema = z
  .object(commitmentsShapeSchema.shape)
  .refine((commitments) => Object.values(commitments).some((slots) => (slots?.length ?? 0) > 0), {
    message: 'Select at least one Sunday service slot',
    path: ['root'],
  });

export const adminUpdateStageSchema = z
  .object({
    action: z.enum([
      'complete_vmt',
      'save_commitments',
      'resend_endorsement',
      'request_endorsement',
      'update_stage',
      'repeat_step',
      'return_to_observation',
      'return_to_interview',
      'archive_applicant',
      'restore_applicant',
      'add_note',
      'upload_avatar',
      'cancel_schedule',
    ]),
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
    applicant_visible_notes: z.string().trim().max(2000).optional().nullable(),
    confirmed_role: z.enum(RECRUITMENT_ROLES).optional(),
    ccf_vmt_id: z.string().trim().max(100).optional().nullable(),
    ccf_vmt_date: dateSchema.optional().nullable(),
    assigned_rfid_member_id: z.string().trim().max(100).optional().nullable(),
    service_commitments: applicantCommitmentsSchema.optional(),
    override_endorsement_gate: z.boolean().optional().default(false),
    image_base64: z.string().max(1_500_000).optional().nullable(),
    leader_name: z.string().trim().max(150).optional().nullable(),
    leader_email: z.string().trim().email().optional().nullable(),
    leader_contact_number: z.string().trim().max(50).optional().nullable(),
  })
  .superRefine((request, context) => {
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
    if (request.action === 'return_to_interview' && request.step_number !== 3) {
      context.addIssue({
        code: 'custom',
        message: 'return_to_interview must reference orientation step 3',
        path: ['step_number'],
      });
    }
    if (request.action === 'return_to_observation' && request.step_number !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'return_to_observation must reference evaluation step 5',
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
    if (request.action === 'upload_avatar' && !request.image_base64) {
      context.addIssue({
        code: 'custom',
        message: 'image_base64 is required for upload_avatar',
        path: ['image_base64'],
      });
    }
  });

export const addRecruiterNoteSchema = z.object({
  application_id: z.string().uuid(),
  step_number: z.number().int().min(1).max(9),
  content: z.string().trim().min(1, 'Note content cannot be empty').max(5000),
});

export type AddRecruiterNotePayload = z.infer<typeof addRecruiterNoteSchema>;

export const recruitmentSettingsSchema = z.object({
  is_recruitment_open: z.boolean(),
  eligibility_rules: eligibilityRulesSchema,
  vmt_registration_url: z.string().trim().url().or(z.literal('')),
  orientation_instructions: z.string().trim().max(5000),
  survey_questions: surveyQuestionBankSchema,
  endorsement_questions: endorsementQuestionBankSchema,
});

export const recruitmentSettingsRecordSchema = recruitmentSettingsSchema.extend({
  id: z.literal(1),
  updated_at: timestampSchema,
});

export const publicRecruitmentConfigSchema = z.object({
  is_recruitment_open: z.boolean(),
  eligibility_rules: eligibilityRulesSchema,
  vmt_registration_url: z.string(),
  orientation_instructions: z.string(),
  survey_questions: publicSurveyQuestionBankSchema,
});

export const recruitmentEndorsementReviewDetailsSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  nickname: z.string(),
  desired_role: z.enum(RECRUITMENT_ROLES),
  created_at: timestampSchema,
  avatar_object_key: z.string().nullable().optional(),
  endorsement_questions: z.array(dynamicFieldSchema).min(1),
  attestation_answers: z.record(z.string(), z.unknown()),
});

const applicantRecruitmentTimelineItemSchema = z.object({
  step_number: recruitmentStepNumberSchema,
  step_key: recruitmentStepKeySchema,
  attempt_number: z.number().int().positive(),
  status: recruitmentStageStatusSchema,
  transaction_type: z.enum([
    'scheduled',
    'rescheduled',
    'completed',
    'repeated_step',
    'returned_to_observation',
    'returned_to_interview',
    'skipped',
    'on_hold',
    'archived',
    'restored',
    'declined',
  ]),
  scheduled_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  assigned_reviewer_name: z.string().nullable(),
  applicant_visible_notes: z.string().nullable(),
  created_at: timestampSchema,
});

export const applicantRecruitmentViewSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  nickname: z.string(),
  avatar_object_key: z.string().nullable(),
  desired_role: z.enum(RECRUITMENT_ROLES),
  confirmed_role: z.enum(RECRUITMENT_ROLES).nullable(),
  current_step: recruitmentStepNumberSchema,
  status: recruitmentApplicationStatusSchema,
  dgroup_approval_status: z.string().nullable(),
  dgroup_leader_name: z.string(),
  vmt_registered: z.boolean(),
  service_commitments: commitmentsShapeSchema,
  assigned_rfid_member_id: z.string().nullable(),
  deployed_at: z.string().nullable(),
  transactions: z.array(applicantRecruitmentTimelineItemSchema),
});

export const recruitmentApplicationRecordSchema = z
  .object({
    id: z.string().uuid(),
    auth_user_id: z.string().uuid().nullable(),
    email: z.string().email(),
    first_name: z.string().min(1),
    middle_name: z.string().nullable(),
    last_name: z.string().min(1),
    full_name: z.string().min(1),
    nickname: z.string().min(1),
    phone: z.string().min(1),
    date_of_birth: dateSchema,
    gender: z.enum(['Male', 'Female']),
    life_stage: z.string().min(1),
    avatar_object_key: z.string().nullable(),
    desired_role: z.enum(RECRUITMENT_ROLES),
    confirmed_role: z.enum(RECRUITMENT_ROLES).nullable(),
    personal_details: z.object({
      wedding_anniversary: dateSchema.nullable().optional(),
      occupation: z.string().min(1),
      company_name: z.string().nullable().optional(),
    }),
    emergency_contact: z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      relation: z.string().min(1),
    }),
    application_history: z.object({
      is_first_time_applicant: z.boolean(),
      previous_application_notes: z.string().nullable().optional(),
    }),
    spiritual_background: z.object({
      ccf_member_since: monthYearSchema,
      other_ministries: z.string().nullable().optional(),
      glc1_status: z.enum(['Completed', 'Ongoing', 'None']),
      glc2_status: z.enum(['Completed', 'Ongoing', 'None']),
    }),
    dgroup_info: z.object({
      is_constant_attendee: z.boolean(),
      member_since: monthYearSchema,
      leader_name: z.string().min(1),
      leader_email: z.string().email(),
      leader_phone: z.string().min(1),
      is_dgroup_leader: z.boolean(),
      leader_since: monthYearSchema.nullable().optional(),
      dgroup_member_count: z.number().int().positive().nullable().optional(),
    }),
    applicant_attested_at: timestampSchema,
    survey_answers: z.record(z.string(), z.enum(['true', 'false'])),
    survey_score: z.number().int().min(0),
    survey_total: z.number().int().min(0),
    current_step: recruitmentStepNumberSchema,
    status: recruitmentApplicationStatusSchema,
    dgroup_approval_id: z.string().uuid().nullable(),
    dgroup_approval_status: z.string().nullable().optional(),
    vmt_registered: z.boolean(),
    ccf_vmt_id: z.string().nullable(),
    ccf_vmt_date: dateSchema.nullable(),
    vmt_registered_at: timestampSchema.nullable(),
    vmt_verified_by: z.string().uuid().nullable(),
    service_commitments: commitmentsShapeSchema,
    assigned_rfid_member_id: z.string().nullable(),
    promoted_user_id: z.string().uuid().nullable(),
    deployed_at: timestampSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .refine((application) => application.survey_total >= application.survey_score, {
    message: 'Survey total cannot be less than the score',
    path: ['survey_total'],
  });

export const recruitmentPipelineTransactionSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  step_number: recruitmentStepNumberSchema,
  step_key: recruitmentStepKeySchema,
  attempt_number: z.number().int().positive(),
  transaction_type: z.enum([
    'scheduled',
    'rescheduled',
    'completed',
    'repeated_step',
    'returned_to_observation',
    'returned_to_interview',
    'skipped',
    'on_hold',
    'archived',
    'restored',
    'declined',
  ]),
  from_step: recruitmentStepNumberSchema.nullable(),
  to_step: recruitmentStepNumberSchema.nullable(),
  status: recruitmentStageStatusSchema,
  assigned_reviewer_id: z.string().uuid().nullable(),
  assigned_reviewer_name: z.string().nullable(),
  scheduled_at: timestampSchema.nullable(),
  completed_at: timestampSchema.nullable(),
  rubric_data: z.record(z.string(), z.unknown()),
  notes: z.string().nullable(),
  applicant_visible_notes: z.string().nullable(),
  created_by_user_id: z.string().uuid().nullable(),
  created_at: timestampSchema,
});

export type RecruitmentStep1Input = z.infer<typeof recruitmentStep1Schema>;
export type DgroupEndorsementDecisionInput = z.infer<typeof dgroupEndorsementDecisionSchema>;
export type ApplicantCommitmentsInput = z.infer<typeof applicantCommitmentsSchema>;
export type AdminUpdateStageInput = z.input<typeof adminUpdateStageSchema>;
export type RecruitmentSettingsInput = z.infer<typeof recruitmentSettingsSchema>;
