import { assert, assertEquals } from '@std/assert';

import { calculateAge, hasMinimumTenure, submitRecruitmentApplicationSchema } from '../schemas.ts';

const validApplication = {
  email: '  applicant@example.com ',
  first_name: 'Jane',
  middle_name: null,
  last_name: 'Doe',
  nickname: 'Janey',
  phone: '+639171234567',
  date_of_birth: '1995-05-10',
  gender: 'Female',
  life_stage: 'Single',
  desired_role: 'Usher',
  personal_details: {
    wedding_anniversary: null,
    occupation: 'Designer',
    company_name: 'Example Co.',
  },
  emergency_contact: {
    name: 'John Doe',
    phone: '+639171234568',
    relation: 'Sibling',
  },
  application_history: {
    is_first_time_applicant: true,
    previous_application_notes: null,
  },
  spiritual_background: {
    ccf_member_since: '2010 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'Ongoing',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2020 Jan',
    leader_name: 'Leader Name',
    leader_email: 'leader@example.com',
    leader_phone: '+639171234569',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  survey_answers: { survey_q1: 'true', survey_q2: 'false' },
  applicant_attested: true,
};

Deno.test('recruitment application schema normalizes email and accepts valid data', () => {
  const result = submitRecruitmentApplicationSchema.safeParse(validApplication);

  assert(result.success);
  if (result.success) {
    assertEquals(result.data.email, 'applicant@example.com');
  }
});

Deno.test('recruitment application schema requires returning applicant details', () => {
  const result = submitRecruitmentApplicationSchema.safeParse({
    ...validApplication,
    application_history: {
      is_first_time_applicant: false,
      previous_application_notes: ' ',
    },
  });

  assert(!result.success);
});

Deno.test('recruitment application schema requires conditional married and leader fields', () => {
  const result = submitRecruitmentApplicationSchema.safeParse({
    ...validApplication,
    life_stage: 'Married',
    dgroup_info: {
      ...validApplication.dgroup_info,
      is_dgroup_leader: true,
    },
  });

  assert(!result.success);
});

Deno.test('calculateAge accounts for whether the birthday has occurred this year', () => {
  const today = new Date('2026-11-02T12:00:00.000Z');

  assertEquals(calculateAge('2008-11-03', today), 17);
  assertEquals(calculateAge('2008-11-02', today), 18);
});

Deno.test('hasMinimumTenure enforces month-level minimum tenure', () => {
  const today = new Date('2026-11-02T12:00:00.000Z');

  assert(hasMinimumTenure('2026 May', 6, today));
  assert(!hasMinimumTenure('2026 Jun', 6, today));
});
