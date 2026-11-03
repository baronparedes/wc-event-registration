import { z } from '../_shared/validation.ts';

const monthYearPattern = /^\d{4} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const phonePattern = /^(?:\+63[\s-]?|0)?9(?:[\s-]?\d){8,9}$/;

const dateSchema = z
  .string()
  .regex(datePattern, 'Date must be in YYYY-MM-DD format')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Date is invalid');

const monthYearSchema = z
  .string()
  .regex(monthYearPattern, 'Month and year must use YYYY MMM format');

export const submitRecruitmentApplicationSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    first_name: z.string().trim().min(1).max(100),
    middle_name: z.string().trim().max(100).optional().nullable(),
    last_name: z.string().trim().min(1).max(100),
    nickname: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(5).max(30).regex(phonePattern, 'Invalid Philippine mobile number'),
    date_of_birth: dateSchema,
    gender: z.enum(['Male', 'Female']),
    life_stage: z.string().trim().min(1).max(100),
    desired_role: z.enum([
      'Prayer Coach',
      'Usher',
      'Backroom Support',
      'IMT Support',
      'VMT Support',
    ]),
    personal_details: z.object({
      wedding_anniversary: dateSchema.optional().nullable(),
      occupation: z.string().trim().min(1).max(150),
      company_name: z.string().trim().max(150).optional().nullable(),
    }),
    emergency_contact: z.object({
      name: z.string().trim().min(1).max(150),
      phone: z
        .string()
        .trim()
        .min(5)
        .max(30)
        .regex(phonePattern, 'Invalid Philippine mobile number'),
      relation: z.string().trim().min(1).max(100),
    }),
    application_history: z.object({
      is_first_time_applicant: z.boolean(),
      previous_application_notes: z.string().trim().max(2000).optional().nullable(),
    }),
    spiritual_background: z.object({
      ccf_member_since: monthYearSchema,
      other_ministries: z.string().trim().max(1000).optional().nullable(),
      glc1_status: z.enum(['Completed', 'Ongoing', 'None']),
      glc2_status: z.enum(['Completed', 'Ongoing', 'None']).optional(),
    }),
    dgroup_info: z.object({
      is_constant_attendee: z.boolean(),
      member_since: monthYearSchema,
      leader_name: z.string().trim().min(1).max(150),
      leader_email: z.string().trim().email().toLowerCase(),
      leader_phone: z
        .string()
        .trim()
        .min(5)
        .max(30)
        .regex(phonePattern, 'Invalid Philippine mobile number'),
      is_dgroup_leader: z.boolean(),
      leader_since: monthYearSchema.optional().nullable(),
      dgroup_member_count: z.number().int().positive().optional().nullable(),
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

export type SubmitRecruitmentApplication = z.infer<typeof submitRecruitmentApplicationSchema>;

export function calculateAge(dateOfBirth: string, today = new Date()): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
  let age = today.getUTCFullYear() - birthYear;
  const hasHadBirthday =
    today.getUTCMonth() + 1 > birthMonth ||
    (today.getUTCMonth() + 1 === birthMonth && today.getUTCDate() >= birthDay);

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age;
}

export function hasMinimumTenure(
  monthYear: string,
  minimumMonths: number,
  today = new Date(),
): boolean {
  const [year, monthName] = monthYear.split(' ');
  const monthByName = new Map([
    ['Jan', 1],
    ['Feb', 2],
    ['Mar', 3],
    ['Apr', 4],
    ['May', 5],
    ['Jun', 6],
    ['Jul', 7],
    ['Aug', 8],
    ['Sep', 9],
    ['Oct', 10],
    ['Nov', 11],
    ['Dec', 12],
  ]);
  const month = monthByName.get(monthName);

  if (!month) {
    return false;
  }

  const startMonth = Number(year) * 12 + month - 1;
  const currentMonth = today.getUTCFullYear() * 12 + today.getUTCMonth();
  const hasReachedStartDay = today.getUTCDate() >= 1;
  const elapsedMonths = currentMonth - startMonth - (hasReachedStartDay ? 0 : 1);

  return elapsedMonths >= minimumMonths;
}
