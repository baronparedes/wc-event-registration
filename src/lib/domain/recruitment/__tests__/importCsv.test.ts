import { describe, expect, it } from 'vitest';

import {
  convertYearsToMonthYear,
  normalizeDateToYMD,
  normalizeRecruitmentRole,
  normalizeRecruitmentStatus,
  parseCsvTextToRows,
  parseRecruitmentCsvText,
} from '../importCsv';

describe('recruitment importCsv helpers', () => {
  describe('normalizeDateToYMD', () => {
    it('normalizes ISO YYYY-MM-DD strings', () => {
      expect(normalizeDateToYMD('1995-04-20')).toBe('1995-04-20');
    });

    it('normalizes M/D/YYYY strings', () => {
      expect(normalizeDateToYMD('4/5/1990')).toBe('1990-04-05');
      expect(normalizeDateToYMD('12/25/1992')).toBe('1992-12-25');
    });

    it('returns null for empty or invalid strings', () => {
      expect(normalizeDateToYMD('')).toBeNull();
      expect(normalizeDateToYMD(null)).toBeNull();
      expect(normalizeDateToYMD('invalid-date')).toBeNull();
    });
  });

  describe('convertYearsToMonthYear', () => {
    it('preserves existing YYYY MMM format', () => {
      expect(convertYearsToMonthYear('2024-01-01', '2019 Jun')).toBe('2019 Jun');
    });

    it('subtracts years from created year and defaults to Jan', () => {
      expect(convertYearsToMonthYear('2024-05-10', '3')).toBe('2021 Jan');
      expect(convertYearsToMonthYear('2024-05-10', 5)).toBe('2019 Jan');
    });

    it('handles non-numeric or empty strings safely', () => {
      const currentYear = new Date().getUTCFullYear();
      expect(convertYearsToMonthYear(null, '')).toBe(`${currentYear} Jan`);
    });
  });

  describe('normalizeRecruitmentRole', () => {
    it('maps variations of role names accurately', () => {
      expect(normalizeRecruitmentRole('Prayer Coach')).toBe('Prayer Coach');
      expect(normalizeRecruitmentRole('prayer')).toBe('Prayer Coach');
      expect(normalizeRecruitmentRole('Backroom Support')).toBe('Backroom Support');
      expect(normalizeRecruitmentRole('IMT Support')).toBe('IMT Support');
      expect(normalizeRecruitmentRole('VMT Support')).toBe('VMT Support');
      expect(normalizeRecruitmentRole('usher')).toBe('Usher');
      expect(normalizeRecruitmentRole('something else')).toBe('Usher');
    });
  });

  describe('normalizeRecruitmentStatus', () => {
    it('maps legacy statuses to domain statuses', () => {
      expect(normalizeRecruitmentStatus('deployed')).toBe('deployed');
      expect(normalizeRecruitmentStatus('active')).toBe('active');
      expect(normalizeRecruitmentStatus('declined')).toBe('declined');
      expect(normalizeRecruitmentStatus('rejected')).toBe('declined');
      expect(normalizeRecruitmentStatus('on hold')).toBe('on_hold');
      expect(normalizeRecruitmentStatus('withdrawn')).toBe('withdrawn');
      expect(normalizeRecruitmentStatus('archived')).toBe('archived');
    });
  });

  describe('parseCsvTextToRows', () => {
    it('handles commas, quotes, and escaped quotes properly', () => {
      const csv = 'Name,Bio,Role\n"Doe, John","He said ""Hello""",Usher';
      const rows = parseCsvTextToRows(csv);
      expect(rows).toEqual([
        ['Name', 'Bio', 'Role'],
        ['Doe, John', 'He said "Hello"', 'Usher'],
      ]);
    });
  });

  describe('parseRecruitmentCsvText', () => {
    const legacyHeaders = [
      'ID',
      'Created',
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
      'GCL 1 Course Status',
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
      'CCF Member in Years',
      'Other Ministries',
      'How long as a DGroup Member (In Years)',
      'Name of DGroup Leader',
      'Email of DGroup Leader',
      'Mobile of DGroup Leader',
      'Is a DGroup Leader?',
      'How long as a DGroup Leader (In Years)',
      'How many members do you have?',
    ].join(',');

    it('correctly maps 42-column legacy records and infers steps for scheduled applicants', () => {
      const legacyRow = [
        '101',
        '2024-01-10T08:00:00Z',
        'Prayer Coach',
        'active',
        'Grace',
        'Cruz',
        'Santos',
        'Gigi',
        '1992-08-14',
        '32',
        '09171112233',
        'grace.santos@example.com',
        'Female',
        '2024-01-10T08:00:00Z',
        'Endorsed',
        '2024-02-15T14:00:00Z',
        '',
        '',
        '2024-01-20T10:00:00Z',
        '',
        '',
        'Yes',
        'Completed',
        'Ongoing',
        'Yes',
        '',
        'Married',
        '2018-12-08',
        'Teacher',
        'Bright Academy',
        'Mark Santos',
        '09175556677',
        'Spouse',
        '4',
        'Choir',
        '3',
        'Pastor Joel',
        'joel@example.com',
        '09189998877',
        'Yes',
        '1',
        '6',
      ].join(',');

      const csvContent = `${legacyHeaders}\n${legacyRow}`;
      const result = parseRecruitmentCsvText(csvContent);

      expect(result.success).toBe(true);
      expect(result.summary.totalRows).toBe(1);
      expect(result.summary.validRowsCount).toBe(1);

      const parsedRow = result.rows[0];
      expect(parsedRow.legacyId).toBe('101');
      expect(parsedRow.fullName).toBe('Grace Cruz Santos');
      expect(parsedRow.email).toBe('grace.santos@example.com');
      expect(parsedRow.desiredRole).toBe('Prayer Coach');
      expect(parsedRow.inferredStep).toBe(3); // Has interview & orientation scheduled
      expect(parsedRow.payload.spiritual_background.ccf_member_since).toBe('2020 Jan'); // 2024 - 4
      expect(parsedRow.payload.dgroup_info.member_since).toBe('2021 Jan'); // 2024 - 3
      expect(parsedRow.payload.dgroup_info.is_dgroup_leader).toBe(true);
      expect(parsedRow.payload.dgroup_info.leader_since).toBe('2023 Jan'); // 2024 - 1
      expect(parsedRow.payload.dgroup_info.dgroup_member_count).toBe(6);
      expect(parsedRow.payload.is_endorsed).toBe(true);
      expect(parsedRow.payload.transactions.length).toBe(3); // Step 1 (reg), 2 (interview), 3 (orientation)
    });

    it('infers step 9 and backfills completed transactions for deployed applicants', () => {
      const deployedRow = [
        '102',
        '2023-05-01T08:00:00Z',
        'Usher',
        'deployed',
        'Juan',
        '',
        'Reyes',
        'Johnny',
        '1990-01-01',
        '34',
        '09170001122',
        'juan.reyes@example.com',
        'Male',
        '2023-05-01T08:00:00Z',
        'Approved',
        '',
        '',
        '',
        '',
        '',
        '2023-08-01',
        'Yes',
        'Completed',
        'None',
        'No',
        'Previous applied in 2021',
        'Single',
        '',
        'Developer',
        'Acme Inc',
        'Ana Reyes',
        '09172223344',
        'Sister',
        '2',
        'None',
        '2',
        'Leader Tim',
        'tim@example.com',
        '09178887766',
        'No',
        '',
        '',
      ].join(',');

      const csvContent = `${legacyHeaders}\n${deployedRow}`;
      const result = parseRecruitmentCsvText(csvContent);

      expect(result.success).toBe(true);
      expect(result.summary.validRowsCount).toBe(1);

      const parsedRow = result.rows[0];
      expect(parsedRow.status).toBe('deployed');
      expect(parsedRow.inferredStep).toBe(9);
      expect(parsedRow.payload.confirmed_role).toBe('Usher');

      // For Usher, Step 6 (Onboarding) is skipped
      const step6Tx = parsedRow.payload.transactions.find((tx) => tx.step_number === 6);
      expect(step6Tx?.status).toBe('skipped');

      // Step 9 is completed
      const step9Tx = parsedRow.payload.transactions.find((tx) => tx.step_number === 9);
      expect(step9Tx?.status).toBe('completed');
    });

    it('flags duplicate emails and records with missing required fields', () => {
      const existingEmails = new Set(['existing@example.com']);

      const duplicateRow = [
        '103',
        '2024-01-01T00:00:00Z',
        'Usher',
        'active',
        'Existing',
        '',
        'User',
        'Exist',
        '1995-01-01',
        '29',
        '09171234567',
        'existing@example.com',
      ].join(',');

      const invalidRow = [
        '104',
        '2024-01-01T00:00:00Z',
        'Usher',
        'active',
        '', // missing first name
        '',
        'User',
        'U',
        'invalid-dob',
        '',
        '',
        'no-name@example.com',
      ].join(',');

      const csvContent = `${legacyHeaders}\n${duplicateRow}\n${invalidRow}`;
      const result = parseRecruitmentCsvText(csvContent, existingEmails);

      expect(result.summary.totalRows).toBe(2);
      expect(result.summary.validRowsCount).toBe(0);
      expect(result.summary.duplicateRowsCount).toBe(1);
      expect(result.summary.errorRowsCount).toBe(1);

      expect(result.rows[0].isDuplicate).toBe(true);
      expect(result.rows[1].isValid).toBe(false);
      expect(result.rows[1].errors).toContain('First name is required');
      expect(result.rows[1].errors).toContain(
        'Valid date of birth (YYYY-MM-DD or MM/DD/YYYY) is required',
      );
    });
  });
});
