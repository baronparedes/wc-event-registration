import { formatDateOnly, formatDateTime } from '@/lib/infrastructure';
import { calculateAge } from '@/pages/recruitment/apply/utils';

import type { RecruitmentApplication } from './types';

export const RECRUITMENT_CSV_HEADERS = [
  'Role',
  'Status',
  'First Name',
  'Middle Name',
  'Last Name',
  'Nickname',
  'DOB',
  'Age',
  'Mobile Number',
  'Email',
  'Gender',
  'Attestation',
  'Endorsement Info',
  'Scheduled Orientation On',
  'Scheduled Evaluation On',
  'Scheduled Observation On',
  'Scheduled Interview On',
  'Scheduled Operations Onboarding On',
  'Started On',
  'Constant DGroup Attendee?',
  'GLC 1 Course Status',
  'GLC 2 Course Status',
  'Is this your first time to apply in the Welcome Center?',
  'What happened to previous application?',
  'Life Stage',
  'Wedding Anniversary',
  'Occupation',
  'Company Name',
  'Emergency Contact Name',
  'Emergency Contact Number',
  'Relation to the Applicant',
  'CCF Member Since (YYYY MMM)',
  'Other Ministries',
  'DGroup Member Since (YYYY MMM)',
  'Name of DGroup Leader',
  'Email of DGroup Leader',
  'Mobile of DGroup Leader',
  'DGroup Leader Status',
  'DGroup Leader Since (YYYY MMM)',
  'How many members do you have?',
  'CCF VMT ID',
  'CCF VMT Date',
] as const;

export type RecruitmentCsvRecord = RecruitmentApplication & {
  latest_schedules?: {
    scheduled_interview_on?: string | null;
    scheduled_orientation_on?: string | null;
    scheduled_observation_on?: string | null;
    scheduled_evaluation_on?: string | null;
    scheduled_operations_onboarding_on?: string | null;
  } | null;
};

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function formatRecruitmentCsvRow(record: RecruitmentCsvRecord): string {
  const age = calculateAge(record.date_of_birth);
  const role = record.confirmed_role ?? record.desired_role;

  const orientationOn = record.latest_schedules?.scheduled_orientation_on
    ? formatDateTime(record.latest_schedules.scheduled_orientation_on)
    : '';
  const evaluationOn = record.latest_schedules?.scheduled_evaluation_on
    ? formatDateTime(record.latest_schedules.scheduled_evaluation_on)
    : '';
  const observationOn = record.latest_schedules?.scheduled_observation_on
    ? formatDateTime(record.latest_schedules.scheduled_observation_on)
    : '';
  const interviewOn = record.latest_schedules?.scheduled_interview_on
    ? formatDateTime(record.latest_schedules.scheduled_interview_on)
    : '';
  const onboardingOn = record.latest_schedules?.scheduled_operations_onboarding_on
    ? formatDateTime(record.latest_schedules.scheduled_operations_onboarding_on)
    : '';

  const attestationDate = record.applicant_attested_at
    ? formatDateTime(record.applicant_attested_at)
    : 'No';

  const cells: (string | number | null | undefined)[] = [
    role,
    record.status,
    record.first_name,
    record.middle_name ?? '',
    record.last_name,
    record.nickname,
    record.date_of_birth,
    age ?? '',
    record.phone,
    record.email,
    record.gender,
    attestationDate,
    record.dgroup_approval_id ? 'Endorsed/Linked' : 'Pending',
    orientationOn,
    evaluationOn,
    observationOn,
    interviewOn,
    onboardingOn,
    formatDateTime(record.created_at),
    record.dgroup_info.is_constant_attendee ? 'Yes' : 'No',
    record.spiritual_background.glc1_status,
    record.spiritual_background.glc2_status ?? '',
    record.application_history.is_first_time_applicant ? 'Yes' : 'No',
    record.application_history.previous_application_notes ?? '',
    record.life_stage,
    record.personal_details.wedding_anniversary ?? '',
    record.personal_details.occupation,
    record.personal_details.company_name ?? '',
    record.emergency_contact.name,
    record.emergency_contact.phone,
    record.emergency_contact.relation,
    record.spiritual_background.ccf_member_since,
    record.spiritual_background.other_ministries ?? '',
    record.dgroup_info.member_since,
    record.dgroup_info.leader_name,
    record.dgroup_info.leader_email,
    record.dgroup_info.leader_phone,
    record.dgroup_info.is_dgroup_leader ? 'Yes' : 'No',
    record.dgroup_info.leader_since ?? '',
    record.dgroup_info.dgroup_member_count ?? '',
    record.ccf_vmt_id ?? '',
    record.ccf_vmt_date ? formatDateOnly(record.ccf_vmt_date) : '',
  ];

  return cells.map(escapeCsvCell).join(',');
}

export function buildRecruitmentCsvExport(records: RecruitmentCsvRecord[]): {
  csvText: string;
  filename: string;
} {
  const headerLine = RECRUITMENT_CSV_HEADERS.map(escapeCsvCell).join(',');
  const rowLines = records.map(formatRecruitmentCsvRow);
  const csvText = [headerLine, ...rowLines].join('\r\n');

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const filename = `recruitment-applications-${todayStr}.csv`;

  return { csvText, filename };
}
