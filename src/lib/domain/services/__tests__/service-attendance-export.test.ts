import { describe, expect, it } from 'vitest';

import {
  buildServiceAttendanceCsvExport,
  escapeServiceCsvValue,
  formatCheckedInTime,
  formatServiceAttendanceStatus,
} from '../service-attendance-export';
import type { ServiceAttendance } from '../types';

describe('service-attendance-export', () => {
  describe('escapeServiceCsvValue', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeServiceCsvValue(null)).toBe('');
      expect(escapeServiceCsvValue(undefined)).toBe('');
    });

    it('returns untouched string if no special characters exist', () => {
      expect(escapeServiceCsvValue('Jane Doe')).toBe('Jane Doe');
      expect(escapeServiceCsvValue('12345')).toBe('12345');
    });

    it('wraps with quotes if value contains commas, quotes, or newlines', () => {
      expect(escapeServiceCsvValue('Doe, Jane')).toBe('"Doe, Jane"');
      expect(escapeServiceCsvValue('He said "Hello"')).toBe('"He said ""Hello"""');

      expect(escapeServiceCsvValue('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
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
          full_name: 'Doe, Jane',
          nickname: 'Jane',
          avatar_object_key: null,
        },
      },
    ];

    it('builds CSV header and formatted rows', () => {
      const { csvText, filename } = buildServiceAttendanceCsvExport({
        records: mockRecords,
        startDate: '2026-03-15',
        endDate: '2026-03-15',
      });

      const lines = csvText.split('\n');
      expect(lines[0]).toBe(
        'Full Name,Nickname,Member ID,RFID,Service Date,Time Slot,Role,Status,Checked In At,Table,Seat,Area',
      );
      expect(lines[1]).toContain('"Doe, Jane"');
      expect(lines[1]).toContain('Jane');
      expect(lines[1]).toContain('MEM-001');
      expect(lines[1]).toContain('RFID001');
      expect(lines[1]).toContain('2026-03-15');
      expect(lines[1]).toContain('9AM');
      expect(lines[1]).toContain('Usher');
      expect(lines[1]).toContain('Regular');
      expect(lines[1]).toContain('12');
      expect(lines[1]).toContain('1');
      expect(lines[1]).toContain('Main Hall');
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
  });
});
