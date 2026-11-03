import { describe, expect, it } from 'vitest';

import type { RecruitmentEligibilityRules, RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { createApplicantFormSchema } from '../schema';

const eligibilityRules: RecruitmentEligibilityRules = {
  min_age: 18,
  max_age: 45,
  requires_glc1_completed: true,
  min_dgroup_months: 6,
};

const validApplication: RecruitmentStep1Input = {
  email: 'test.applicant@example.com',
  first_name: 'Test Applicant',
  middle_name: null,
  last_name: 'Test Member',
  nickname: 'Test',
  phone: '09171234567',
  date_of_birth: '1990-01-01',
  gender: 'Female',
  life_stage: 'Single',
  desired_role: 'Prayer Coach',
  personal_details: { occupation: 'Teacher', company_name: null, wedding_anniversary: null },
  emergency_contact: { name: 'Test Contact', phone: '09179876543', relation: 'Sibling' },
  application_history: { is_first_time_applicant: true },
  spiritual_background: {
    ccf_member_since: '2010 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'Ongoing',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2010 Jan',
    leader_name: 'Test Leader',
    leader_email: 'test.leader@example.com',
    leader_phone: '09171112222',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  survey_answers: {},
  applicant_attested: true,
};

describe('createApplicantFormSchema', () => {
  it('accepts applicants within age, GLC, and DGroup requirements', () => {
    expect(createApplicantFormSchema(eligibilityRules).safeParse(validApplication).success).toBe(
      true,
    );
  });

  it('rejects applicants outside the age range or missing required GLC completion', () => {
    const schema = createApplicantFormSchema(eligibilityRules);
    const tooYoung = schema.safeParse({ ...validApplication, date_of_birth: '2010-01-01' });
    const missingGlc = schema.safeParse({
      ...validApplication,
      spiritual_background: { ...validApplication.spiritual_background, glc1_status: 'Ongoing' },
    });

    expect(tooYoung.success).toBe(false);
    expect(missingGlc.success).toBe(false);
    expect(
      createApplicantFormSchema({ ...eligibilityRules, requires_glc1_completed: false }).safeParse({
        ...validApplication,
        spiritual_background: { ...validApplication.spiritual_background, glc1_status: 'Ongoing' },
      }).success,
    ).toBe(true);
  });

  it('rejects invalid and insufficient DGroup tenure', () => {
    const schema = createApplicantFormSchema(eligibilityRules);
    const invalidMonth = schema.safeParse({
      ...validApplication,
      dgroup_info: { ...validApplication.dgroup_info, member_since: 'not a month' },
    });
    const insufficientTenure = schema.safeParse({
      ...validApplication,
      dgroup_info: { ...validApplication.dgroup_info, member_since: '2026 Sep' },
    });

    expect(invalidMonth.success).toBe(false);
    expect(insufficientTenure.success).toBe(false);
  });
});
