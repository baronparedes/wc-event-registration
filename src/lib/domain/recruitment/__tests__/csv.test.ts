import { describe, expect, it } from 'vitest';

import { parseCsvTextToRows } from '@/lib/domain/services/csv-parser';

import {
  RECRUITMENT_CSV_HEADERS,
  type RecruitmentCsvRecord,
  buildRecruitmentCsvExport,
  formatRecruitmentCsvRow,
} from '../csv';

const mockRecord: RecruitmentCsvRecord = {
  id: 'app-1',
  auth_user_id: null,
  email: 'applicant@example.com',
  first_name: 'Test Juan',
  middle_name: 'Test Santos',
  last_name: 'Test Dela Cruz',
  full_name: 'Test Juan Dela Cruz',
  nickname: 'Test Juancho',
  phone: '09171234567',
  date_of_birth: '1995-05-15',
  gender: 'Male',
  life_stage: 'Single',
  avatar_object_key: null,
  desired_role: 'Usher',
  confirmed_role: 'Usher',
  personal_details: {
    occupation: 'Engineer',
    company_name: 'Tech Corp',
    wedding_anniversary: null,
  },
  emergency_contact: {
    name: 'Test Maria Dela Cruz',
    phone: '09181234567',
    relation: 'Mother',
  },
  application_history: {
    is_first_time_applicant: true,
    previous_application_notes: null,
  },
  spiritual_background: {
    ccf_member_since: '2020 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'Completed',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2019 Jun',
    leader_name: 'Test Peter Leader',
    leader_email: 'leader@example.com',
    leader_phone: '09191234567',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  applicant_attested_at: '2026-11-01T10:00:00+08:00',
  survey_answers: { survey_q1: 'true' },
  survey_score: 18,
  survey_total: 20,
  current_step: 4,
  status: 'active',
  dgroup_approval_id: 'approval-123',
  vmt_registered: true,
  ccf_vmt_id: 'VMT-9988',
  ccf_vmt_date: '2026-11-02',
  vmt_registered_at: '2026-11-02T14:00:00+08:00',
  vmt_verified_by: null,
  service_commitments: { first_sunday: ['9AM'] },
  assigned_rfid_member_id: 'RFID-1234',
  promoted_user_id: null,
  deployed_at: null,
  created_at: '2026-11-01T09:00:00+08:00',
  updated_at: '2026-11-02T15:00:00+08:00',
  latest_schedules: {
    scheduled_interview_on: '2026-11-05T14:00:00+08:00',
    scheduled_orientation_on: null,
    scheduled_observation_on: null,
    scheduled_evaluation_on: null,
    scheduled_operations_onboarding_on: null,
  },
};

describe('Recruitment CSV Export', () => {
  it('has exactly 42 canonical headers', () => {
    expect(RECRUITMENT_CSV_HEADERS).toHaveLength(42);
    expect(RECRUITMENT_CSV_HEADERS[0]).toBe('Role');
    expect(RECRUITMENT_CSV_HEADERS[41]).toBe('CCF VMT Date');
  });

  it('formats a recruitment csv row correctly with all 42 fields', () => {
    const { csvText } = buildRecruitmentCsvExport([mockRecord]);
    const parsedRows = parseCsvTextToRows(csvText);

    expect(parsedRows).toHaveLength(2);
    const headers = parsedRows[0];
    const dataRow = parsedRows[1];

    expect(headers).toHaveLength(42);
    expect(dataRow).toHaveLength(42);

    expect(dataRow[0]).toBe('Usher'); // Role
    expect(dataRow[1]).toBe('active'); // Status
    expect(dataRow[2]).toBe('Test Juan'); // First Name
    expect(dataRow[4]).toBe('Test Dela Cruz'); // Last Name
    expect(dataRow[9]).toBe('applicant@example.com'); // Email
    expect(dataRow[40]).toBe('VMT-9988'); // CCF VMT ID
  });

  it('properly escapes commas, quotes, and newlines in cells', () => {
    const recordWithCommas: RecruitmentCsvRecord = {
      ...mockRecord,
      personal_details: {
        ...mockRecord.personal_details,
        occupation: 'Lead, Senior Engineer',
      },
      application_history: {
        is_first_time_applicant: false,
        previous_application_notes: 'Applied in "2024",\nwas out of country',
      },
    };

    const row = formatRecruitmentCsvRow(recordWithCommas);
    expect(row).toContain('"Lead, Senior Engineer"');
    expect(row).toContain('"Applied in ""2024"",\nwas out of country"');
  });

  it('builds full CSV export text and filename in Asia/Manila format', () => {
    const { csvText, filename } = buildRecruitmentCsvExport([mockRecord]);

    expect(filename).toMatch(/^recruitment-applications-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = csvText.split('\r\n');
    expect(lines).toHaveLength(2); // Header + 1 record
    expect(lines[0]).toBe(RECRUITMENT_CSV_HEADERS.join(','));
  });
});
