import { describe, expect, it } from 'vitest';

import { RECRUITMENT_ROLES } from '../constants';
import {
  applicantCommitmentsSchema,
  recruitmentApplicationRecordSchema,
  recruitmentSettingsSchema,
  recruitmentStep1Schema,
} from '../schemas';

const validApplication = {
  email: 'applicant@example.com',
  first_name: 'Test Taylor',
  middle_name: null,
  last_name: 'Test Member',
  nickname: 'Test Tay',
  phone: '09171234567',
  date_of_birth: '1995-06-15',
  gender: 'Female',
  life_stage: 'Single',
  desired_role: 'Usher',
  personal_details: { occupation: 'Teacher' },
  emergency_contact: { name: 'Test Jordan Member', phone: '09179876543', relation: 'Sibling' },
  application_history: { is_first_time_applicant: true },
  spiritual_background: {
    ccf_member_since: '2018 Jan',
    glc1_status: 'Completed',
    glc2_status: 'Ongoing',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2022 Jan',
    leader_name: 'Test Casey Leader',
    leader_email: 'leader@example.com',
    leader_phone: '09171112222',
    is_dgroup_leader: false,
  },
  survey_answers: { survey_q1: 'true' },
  applicant_attested: true,
};

const validApplicationRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  auth_user_id: null,
  email: 'applicant@example.com',
  first_name: 'Test Taylor',
  middle_name: null,
  last_name: 'Test Member',
  full_name: 'Test Taylor Test Member',
  nickname: 'Test Tay',
  phone: '09171234567',
  date_of_birth: '1995-06-15',
  gender: 'Female',
  life_stage: 'Single',
  avatar_object_key: null,
  desired_role: 'Usher',
  confirmed_role: null,
  personal_details: { occupation: 'Teacher' },
  emergency_contact: { name: 'Test Jordan Member', phone: '09179876543', relation: 'Sibling' },
  application_history: { is_first_time_applicant: true },
  spiritual_background: {
    ccf_member_since: '2018 Jan',
    glc1_status: 'Completed',
    glc2_status: 'Ongoing',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2022 Jan',
    leader_name: 'Test Casey Leader',
    leader_email: 'leader@example.com',
    leader_phone: '09171112222',
    is_dgroup_leader: false,
  },
  applicant_attested_at: '2026-11-02T00:00:00+00:00',
  survey_answers: { survey_q1: 'true' },
  survey_score: 1,
  survey_total: 1,
  current_step: 1,
  status: 'active',
  dgroup_approval_id: null,
  vmt_registered: false,
  ccf_vmt_id: null,
  ccf_vmt_date: null,
  vmt_registered_at: null,
  vmt_verified_by: null,
  service_commitments: { third_sunday: ['12NN'] },
  assigned_rfid_member_id: null,
  promoted_user_id: null,
  deployed_at: null,
  created_at: '2026-11-02T00:00:00+00:00',
  updated_at: '2026-11-02T00:00:00+00:00',
};

describe('recruitment schemas', () => {
  it('accepts a Step 1 application matching the Edge Function contract', () => {
    expect(recruitmentStep1Schema.safeParse(validApplication).success).toBe(true);
  });

  it('rejects OIC and requires returning-applicant details', () => {
    expect(RECRUITMENT_ROLES).not.toContain('OIC');
    expect(
      recruitmentStep1Schema.safeParse({
        ...validApplication,
        desired_role: 'OIC',
        application_history: {
          is_first_time_applicant: false,
          previous_application_notes: '  ',
        },
      }).success,
    ).toBe(false);
  });

  it('requires at least one Sunday service commitment', () => {
    expect(applicantCommitmentsSchema.safeParse({}).success).toBe(false);
    expect(applicantCommitmentsSchema.safeParse({ third_sunday: ['12NN'] }).success).toBe(true);
  });

  it('validates application rows and rejects malformed persisted JSON', () => {
    expect(recruitmentApplicationRecordSchema.safeParse(validApplicationRecord).success).toBe(true);
    expect(
      recruitmentApplicationRecordSchema.safeParse({
        ...validApplicationRecord,
        service_commitments: { first_sunday: ['11AM'] },
      }).success,
    ).toBe(false);
  });

  it('preserves toggle metadata and requires active question banks', () => {
    const settings = {
      is_recruitment_open: false,
      eligibility_rules: {
        min_age: 18,
        max_age: 45,
        requires_glc1_completed: true,
        min_dgroup_months: 6,
      },
      vmt_registration_url: '',
      orientation_instructions: '',
      survey_questions: [
        {
          field_key: 'survey_q1',
          label: 'Test survey question',
          field_type: 'multi_select_toggle',
          is_required: true,
          is_active: true,
          correct_answer: 'true',
          options: [
            { label: 'Yes', value: 'yes', toggle_label: 'Add details', toggle_default: true },
          ],
        },
      ],
      endorsement_questions: [
        {
          field_key: 'endorsement_q1',
          label: 'Test endorsement question',
          field_type: 'text',
          is_required: true,
          is_active: true,
        },
      ],
    };

    const result = recruitmentSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.survey_questions[0].options?.[0]).toMatchObject({
        toggle_label: 'Add details',
        toggle_default: true,
      });
    }
    expect(recruitmentSettingsSchema.safeParse({ ...settings, survey_questions: [] }).success).toBe(
      false,
    );
    expect(
      recruitmentSettingsSchema.safeParse({
        ...settings,
        endorsement_questions: [{ ...settings.endorsement_questions[0], is_active: false }],
      }).success,
    ).toBe(false);
  });
});
