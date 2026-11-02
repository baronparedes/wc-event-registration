export const RECRUITMENT_CATEGORIES = [
  'Men',
  'Women',
  'Singles',
  'Youth',
  'B1G',
  'NXTGen',
] as const;

export const RECRUITMENT_ROLES = [
  'Backroom Support',
  'IMT Support',
  'Prayer Coach',
  'Usher',
  'VMT Support',
] as const;

export const RECRUITMENT_SERVICE_SLOTS = ['9AM', '12NN', '3PM'] as const;

export const RECRUITMENT_STEPS = [
  {
    stepNumber: 1,
    key: 'register',
    title: 'Registration and Biblical Survey',
    shortLabel: 'Register',
    description: 'Submit applicant details and complete the Biblical Survey.',
    isRoleConditional: false,
  },
  {
    stepNumber: 2,
    key: 'interview',
    title: 'Interview',
    shortLabel: 'Interview',
    description: 'Meet with a Welcome Center interviewer.',
    isRoleConditional: false,
  },
  {
    stepNumber: 3,
    key: 'orientation',
    title: 'Orientation',
    shortLabel: 'Orientation',
    description: 'Complete Welcome Center operations orientation.',
    isRoleConditional: false,
  },
  {
    stepNumber: 4,
    key: 'observation',
    title: 'Observation',
    shortLabel: 'Observation',
    description: 'Shadow experienced Welcome Center volunteers.',
    isRoleConditional: false,
  },
  {
    stepNumber: 5,
    key: 'evaluation',
    title: 'Evaluation',
    shortLabel: 'Evaluation',
    description: 'Review readiness and coaching feedback.',
    isRoleConditional: false,
  },
  {
    stepNumber: 6,
    key: 'onboarding',
    title: 'Prayer Coach Onboarding',
    shortLabel: 'Onboarding',
    description: 'Serve one Sunday service as an Usher before Prayer Coach service.',
    isRoleConditional: true,
  },
  {
    stepNumber: 7,
    key: 'vmt_registration',
    title: 'CCF VMT Registration',
    shortLabel: 'VMT Registration',
    description: 'Register in the external CCF VMT database.',
    isRoleConditional: false,
  },
  {
    stepNumber: 8,
    key: 'rfid_releasing',
    title: 'RFID and Service Commitments',
    shortLabel: 'RFID Releasing',
    description: 'Confirm Sunday service commitments and receive an RFID tag.',
    isRoleConditional: false,
  },
  {
    stepNumber: 9,
    key: 'deployment',
    title: 'Deployment',
    shortLabel: 'Deployment',
    description: 'Promote the applicant to an active Welcome Center member.',
    isRoleConditional: false,
  },
] as const;
