import { describe, expect, it } from 'vitest';

import {
  buildFailedServiceAttendanceCsvExport,
  buildMissedServiceCommitmentsCsvExport,
  buildServiceAttendanceCsvExport,
  escapeServiceCsvValue,
  formatCheckedInTime,
  formatServiceAttendanceStatus,
} from '../service-attendance-export';
import type { MissedServiceCommitment, ServiceAttendance } from '../types';

describe('service-attendance-export', () => {
  describe('escapeServiceCsvValue', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeServiceCsvValue(null)).toBe('');
      expect(escapeServiceCsvValue(undefined)).toBe('');
    });

    it('returns untouched string if no special characters exist', () => {
      expect(escapeServiceCsvValue('Test Member')).toBe('Test Member');
      expect(escapeServiceCsvValue('12345')).toBe('12345');
    });

    it('wraps with quotes if value contains commas, quotes, newlines, or carriage returns', () => {
      expect(escapeServiceCsvValue('Member, Test')).toBe('"Member, Test"');
      expect(escapeServiceCsvValue('He said "Hello"')).toBe('"He said ""Hello"""');
      expect(escapeServiceCsvValue('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
      expect(escapeServiceCsvValue('Line 1\rLine 2')).toBe('"Line 1\rLine 2"');
    });
  });

  describe('formatServiceAttendanceStatus', () => {
    const baseRecord: ServiceAttendance = {
      id: 'rec-1',
      user_id: 'u-1',
      rfid: 'RFID001',
      service_date: '2026-03-15',
      time_slot: '9AM',
      checked_in_at: '2026-03-15T09:00:00Z',
      is_walk_in: false,
      is_override: false,
      is_manual_entry: false,
      service_seat_id: null,
      metadata: {},
      created_at: '2026-03-15T09:00:00Z',
      updated_at: '2026-03-15T09:00:00Z',
      created_by: null,
      updated_by: null,
    };

    it('returns Regular when neither walk-in nor override', () => {
      expect(formatServiceAttendanceStatus(baseRecord)).toBe('Regular');
    });

    it('returns Walk-in when is_walk_in is true', () => {
      expect(formatServiceAttendanceStatus({ ...baseRecord, is_walk_in: true })).toBe('Walk-in');
    });

    it('returns Late / Tardy when is_override is true', () => {
      expect(formatServiceAttendanceStatus({ ...baseRecord, is_override: true })).toBe(
        'Late / Tardy',
      );
    });

    it('returns Walk-in, Late / Tardy when both flags are true', () => {
      expect(
        formatServiceAttendanceStatus({ ...baseRecord, is_walk_in: true, is_override: true }),
      ).toBe('Walk-in, Late / Tardy');
    });
  });

  describe('formatCheckedInTime', () => {
    it('returns empty string for missing or invalid dates', () => {
      expect(formatCheckedInTime(null)).toBe('');
      expect(formatCheckedInTime(undefined)).toBe('');
      expect(formatCheckedInTime('invalid-date')).toBe('');
    });

    it('formats valid timestamp into yyyy-MM-dd hh:mm:ss a format', () => {
      const formatted = formatCheckedInTime('2026-03-15T09:30:00Z');
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (AM|PM)/);
    });
  });

  describe('buildServiceAttendanceCsvExport', () => {
    const mockRecords: ServiceAttendance[] = [
      {
        id: 'rec-2',
        user_id: 'u-2',
        rfid: 'RFID002',
        service_date: '2026-03-22',
        time_slot: '12NN',
        checked_in_at: '2026-03-22T12:05:00Z',
        is_walk_in: false,
        is_override: false,
        is_manual_entry: false,
        service_seat_id: null,
        metadata: {},
        created_at: '2026-03-22T12:05:00Z',
        updated_at: '2026-03-22T12:05:00Z',
        created_by: null,
        updated_by: null,
        service_seats: null,
        user: {
          member_id: 'MEM-002',
          full_name: 'Test Alpha, Sample',
          nickname: 'Test Alpha',
          avatar_object_key: null,
        },
      },
      {
        id: 'rec-1',
        user_id: 'u-1',
        rfid: 'RFID001',
        service_date: '2026-03-15',
        time_slot: '9AM',
        checked_in_at: '2026-03-15T09:05:00Z',
        is_walk_in: false,
        is_override: false,
        is_manual_entry: false,
        service_seat_id: 'seat-1',
        metadata: { role: 'Usher' },
        created_at: '2026-03-15T09:05:00Z',
        updated_at: '2026-03-15T09:05:00Z',
        created_by: null,
        updated_by: null,
        service_seats: {
          id: 'seat-1',
          table_number: '12',
          seat_number: '1',
          area: 'Main Hall',
        },
        user: {
          member_id: 'MEM-001',
          full_name: 'Test Zeta, Sample',
          nickname: 'Test Sample',
          avatar_object_key: null,
        },
      },
      {
        id: 'rec-3',
        user_id: 'u-3',
        rfid: '',
        service_date: '2026-03-15',
        time_slot: '9AM',
        checked_in_at: '',
        is_walk_in: true,
        is_override: false,
        is_manual_entry: false,
        service_seat_id: null,
        metadata: {},
        created_at: '2026-03-15T09:05:00Z',
        updated_at: '2026-03-15T09:05:00Z',
        created_by: null,
        updated_by: null,
        service_seats: null,
        user: null,
      },
    ];

    it('builds CSV header and formatted rows sorted by date then user full_name', () => {
      const { csvText, filename } = buildServiceAttendanceCsvExport({
        records: mockRecords,
        startDate: '2026-03-15',
        endDate: '2026-03-15',
      });

      const lines = csvText.split('\n');
      expect(lines[0]).toBe(
        'Full Name,Nickname,Member ID,RFID,Service Date,Time Slot,Role,Status,Checked In At,Table,Seat,Area',
      );
      // rec-3 (date 2026-03-15, empty user name) comes before rec-1 (date 2026-03-15, Zeta)
      expect(lines[1]).toContain('Walk-in');
      // rec-1 (date 2026-03-15, Zeta)
      expect(lines[2]).toContain('"Test Zeta, Sample"');
      expect(lines[2]).toContain('Test Sample');
      expect(lines[2]).toContain('MEM-001');
      expect(lines[2]).toContain('RFID001');
      expect(lines[2]).toContain('Usher');
      expect(lines[2]).toContain('12');
      expect(lines[2]).toContain('1');
      expect(lines[2]).toContain('Main Hall');
      // rec-2 (date 2026-03-22, Alpha) comes last
      expect(lines[3]).toContain('"Test Alpha, Sample"');

      expect(filename).toMatch(/^service-attendance-2026-03-15-\d{8}-\d{6}\.csv$/);
    });

    it('formats date range in filename when start and end dates differ', () => {
      const { filename } = buildServiceAttendanceCsvExport({
        records: [],
        startDate: '2026-03-01',
        endDate: '2026-03-15',
      });

      expect(filename).toMatch(/^service-attendance-2026-03-01-to-2026-03-15-\d{8}-\d{6}\.csv$/);
    });

    it('formats single date filename when only startDate is provided', () => {
      const { filename } = buildServiceAttendanceCsvExport({
        records: [],
        startDate: '2026-03-01',
      });

      expect(filename).toMatch(/^service-attendance-2026-03-01-\d{8}-\d{6}\.csv$/);
    });

    it('formats generic filename when neither date is provided', () => {
      const { filename } = buildServiceAttendanceCsvExport({
        records: [],
      });

      expect(filename).toMatch(/^service-attendance-\d{8}-\d{6}\.csv$/);
    });
  });

  describe('buildFailedServiceAttendanceCsvExport', () => {
    it('exports failed rows with row number, combined errors, and original columns in preferred order', () => {
      const failedRows = [
        {
          row_number: 3,
          errors: ['RFID not found in system.', 'Table 999 not found in layout.'],
          originalData: {
            RFID: 'UNKNOWN123',
            Date: '3/9/2026',
            Time: '09:00:00',
            Time_Slot: '9AM',
            Table: '999',
            Name: 'Mystery Person',
            Role: 'Attendee',
            CustomNotes: 'Need check',
          },
        },
        {
          row_number: 4,
          errors: ['Invalid time'],
          originalData: {
            RFID: 'RFID999',
            Date: '',
            Time: '',
            Time_Slot: '',
            Table: '',
            Name: '',
            Role: '',
            CustomNotes: '',
          } as Record<string, string>,
        },
      ];

      const { csvText, filename } = buildFailedServiceAttendanceCsvExport({ failedRows });
      const lines = csvText.split('\n');

      expect(lines[0]).toBe('Row,Errors,RFID,Date,Time,Time_Slot,Table,Name,Role,CustomNotes');
      expect(lines[1]).toContain('3');
      expect(lines[1]).toContain('RFID not found in system.; Table 999 not found in layout.');
      expect(lines[1]).toContain('UNKNOWN123');
      expect(lines[1]).toContain('Mystery Person');
      expect(lines[1]).toContain('Need check');
      expect(lines[2]).toContain('4');
      expect(lines[2]).toContain('Invalid time');
      expect(lines[2]).toContain('RFID999');
      expect(filename).toMatch(/^failed-service-attendance-migration-\d{8}-\d{6}\.csv$/);
    });
  });

  describe('buildMissedServiceCommitmentsCsvExport', () => {
    const mockMissed: MissedServiceCommitment[] = [
      {
        user_id: 'u-2',
        avatar_object_key: null,
        member_id: 'MEM-002',
        full_name: 'Test Beta, Sample',
        nickname: null,
        role: '',
        category: null,
        service_date: '2026-03-15',
        time_slot: '12NN',
        phone: null,
        status: 'absent',
      },
      {
        user_id: 'u-1',
        avatar_object_key: null,
        member_id: 'MEM-001',
        full_name: 'Test Alpha, Sample',
        nickname: 'Test Al',
        role: 'Usher',
        category: 'Men',
        service_date: '2026-03-15',
        time_slot: '9AM',
        phone: '09123456789',
        status: 'excused',
      },
      {
        user_id: 'u-3',
        avatar_object_key: null,
        member_id: 'MEM-003',
        full_name: 'Test Gamma, Sample',
        nickname: 'Test Gam',
        role: 'Greeter',
        category: 'Women',
        service_date: '2026-03-08',
        time_slot: '9AM',
        phone: '09987654321',
        status: 'absent',
      },
      {
        user_id: 'u-4',
        avatar_object_key: null,
        member_id: '',
        full_name: 'Test Delta, Sample',
        nickname: null,
        role: '',
        category: null,
        service_date: '2026-03-15',
        time_slot: '9AM',
        phone: null,
        status: 'absent',
      },
    ];

    it('sorts records by service_date, then time_slot, then full_name and maps status correctly', () => {
      const { csvText, filename } = buildMissedServiceCommitmentsCsvExport({
        records: mockMissed,
        startDate: '2026-03-08',
        endDate: '2026-03-15',
      });

      const lines = csvText.split('\n');
      expect(lines[0]).toBe(
        'Member ID,Full Name,Nickname,Role,Category,Service Date,Committed Time Slot,Contact Number,Status',
      );
      // First is Gamma (2026-03-08)
      expect(lines[1]).toContain('"Test Gamma, Sample"');
      expect(lines[1]).toContain('Absent');

      // Next is Beta (2026-03-15 12NN, '12NN' alphabetically before '9AM')
      expect(lines[2]).toContain('"Test Beta, Sample"');
      expect(lines[2]).toContain('Absent');

      // Next is Alpha (2026-03-15 9AM)
      expect(lines[3]).toContain('"Test Alpha, Sample"');
      expect(lines[3]).toContain('Excused');

      // Next is Delta (2026-03-15 9AM)
      expect(lines[4]).toContain('"Test Delta, Sample"');
      expect(lines[4]).toContain('Absent');

      expect(filename).toBe('service-missed-commitments-2026-03-08_to_2026-03-15.csv');
    });

    it('handles single date filename when startDate equals endDate', () => {
      const { filename } = buildMissedServiceCommitmentsCsvExport({
        records: [],
        startDate: '2026-03-15',
        endDate: '2026-03-15',
      });

      expect(filename).toBe('service-missed-commitments-2026-03-15.csv');
    });

    it('handles generic filename when date range is not specified', () => {
      const { filename } = buildMissedServiceCommitmentsCsvExport({
        records: [],
      });

      expect(filename).toBe('service-missed-commitments.csv');
    });
  });
});
