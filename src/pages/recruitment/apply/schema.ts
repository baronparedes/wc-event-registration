import type { RecruitmentEligibilityRules, RecruitmentStep1Input } from '@/lib/domain/recruitment';
import { recruitmentStep1Schema } from '@/lib/domain/recruitment';

import { calculateAge, monthsSinceMonthYear } from './utils';

export function createApplicantFormSchema(eligibilityRules: RecruitmentEligibilityRules) {
  return recruitmentStep1Schema.superRefine((application, context) => {
    const age = calculateAge(application.date_of_birth);
    if (age === null || age < eligibilityRules.min_age || age > eligibilityRules.max_age) {
      context.addIssue({
        code: 'custom',
        message: `Applicants must be between ${eligibilityRules.min_age} and ${eligibilityRules.max_age} years old.`,
        path: ['date_of_birth'],
      });
    }

    if (
      eligibilityRules.requires_glc1_completed &&
      application.spiritual_background.glc1_status !== 'Completed'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'GLC Level 1 must be completed before applying.',
        path: ['spiritual_background', 'glc1_status'],
      });
    }

    const dgroupMonths = monthsSinceMonthYear(application.dgroup_info.member_since);
    if (dgroupMonths === null || dgroupMonths <= eligibilityRules.min_dgroup_months) {
      context.addIssue({
        code: 'custom',
        message: `DGroup attendance must exceed ${eligibilityRules.min_dgroup_months} months.`,
        path: ['dgroup_info', 'member_since'],
      });
    }
  });
}

export type ApplicantFormValues = RecruitmentStep1Input;
