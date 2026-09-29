import { describe, expect, it } from 'vitest';

import {
  UNASSIGNED_TABLE,
  USHER_BACKROOM_TABLE,
  mapServiceAttendanceTableNumber,
  normalizeDateToYYYYMMDD,
  parseCsvTextToRows,
  parseServiceAttendanceCsv,
  processParsedCsvData,
} from '../csv-parser';

describe('Service Attendance CSV Parser', () => {
  describe('mapServiceAttendanceTableNumber', () => {
    it('maps blank or X tables to Unassigned', () => {
      expect(mapServiceAttendanceTableNumber('')).toBe(UNASSIGNED_TABLE);
      expect(mapServiceAttendanceTableNumber('   ')).toBe(UNASSIGNED_TABLE);
      expect(mapServiceAttendanceTableNumber('X')).toBe(UNASSIGNED_TABLE);
      expect(mapServiceAttendanceTableNumber('x')).toBe(UNASSIGNED_TABLE);
    });

    it('maps numbers strictly greater than 100 to Usher / Backroom / IMT / VMT', () => {
      expect(mapServiceAttendanceTableNumber('101')).toBe(USHER_BACKROOM_TABLE);
      expect(mapServiceAttendanceTableNumber('102')).toBe(USHER_BACKROOM_TABLE);
      expect(mapServiceAttendanceTableNumber('150')).toBe(USHER_BACKROOM_TABLE);
      expect(mapServiceAttendanceTableNumber('Table 105')).toBe(USHER_BACKROOM_TABLE);
    });

    it('retains tables from 1 to 100 as-is', () => {
      expect(mapServiceAttendanceTableNumber('1')).toBe('1');
      expect(mapServiceAttendanceTableNumber('50')).toBe('50');
      expect(mapServiceAttendanceTableNumber('100')).toBe('100');
    });

    it('retains non-numeric table names as-is', () => {
      expect(mapServiceAttendanceTableNumber('Usher / Backroom / IMT / VMT')).toBe(
        'Usher / Backroom / IMT / VMT',
      );
      expect(mapServiceAttendanceTableNumber('VIP Lounge')).toBe('VIP Lounge');
    });
  });

  describe('parseCsvTextToRows', () => {
    it('parses basic CSV content and handles quotes', () => {
      const csv = 'A,B,"C,D"\n1,2,3';
      const result = parseCsvTextToRows(csv);
      expect(result).toEqual([
        ['A', 'B', 'C,D'],
        ['1', '2', '3'],
      ]);
    });

    it('handles escaped quotes, CRLF and trailing blank rows', () => {
      expect(parseCsvTextToRows('RFID,Name\r\n123,"Test ""Nickname"" Member"\r\n\r\n')).toEqual([
        ['RFID', 'Name'],
        ['123', 'Test "Nickname" Member'],
      ]);
    });
  });

  describe('parseServiceAttendanceCsv', () => {
    it('rejects a header-only CSV', () => {
      expect(parseServiceAttendanceCsv('RFID,Date,Time,Time_Slot,Table')).toEqual({
        success: false,
        error: 'CSV file is empty or missing data rows.',
      });
    });

    it('returns error if missing required headers', () => {
      const csv = 'RFID,Date,Time\n123,3/9/25,09:00:00';
      const result = parseServiceAttendanceCsv(csv);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Missing required CSV headers');
      }
    });

    it('successfully parses valid CSV', () => {
      const csv = 'RFID,Date,Time,Time_Slot,Table\n123,3/9/25,09:00:00,9AM,15';
      const result = parseServiceAttendanceCsv(csv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rows).toHaveLength(1);
        expect(result.data.rows[0].RFID).toBe('123');
        expect(result.data.rows[0].Table).toBe('15');
      }
    });
  });

  describe('normalizeDateToYYYYMMDD', () => {
    it('normalizes Date objects, dash-separated dates and Excel serial dates', () => {
      expect(normalizeDateToYYYYMMDD(new Date('2026-03-15T00:00:00Z'))).toBe('2026-03-15');
      expect(normalizeDateToYYYYMMDD('3-15-26')).toBe('2026-03-15');
      expect(normalizeDateToYYYYMMDD('45731')).toBe('2025-03-15');
    });

    it('rejects missing, invalid and unrecognized dates', () => {
      expect(normalizeDateToYYYYMMDD(null)).toBeNull();
      expect(normalizeDateToYYYYMMDD(new Date('invalid'))).toBeNull();
      expect(normalizeDateToYYYYMMDD('not a date')).toBeNull();
    });
  });

  describe('processParsedCsvData', () => {
    it('normalizes optional import columns into flags and audit metadata', () => {
      const [row] = processParsedCsvData({
        headers: [],
        rows: [
          {
            'Member ID': 'RFID-001',
            'Service Date': '2026/3/15',
            'Check In Time': '09:20:00',
            'Time Slot': '9AM',
            'Table #': 'Table 101',
            'Full Name': 'Test Import Member',
            'Volunteer ID': 'VOL-001',
            Id: 'legacy-1',
            'Manual Entry': 'TRUE',
            'Is Override': '1',
            'Is Walk In': 'yes',
          },
        ],
      });

      expect(row).toMatchObject({
        rfid: 'RFID-001',
        service_date: '2026-03-15',
        checked_in_at: '2026-03-15T09:20:00+08:00',
        table_number: USHER_BACKROOM_TABLE,
        is_manual_entry: true,
        is_override: true,
        is_walk_in: true,
        metadata: {
          legacy_name: 'Test Import Member',
          volunteer_id: 'VOL-001',
          legacy_id: 'legacy-1',
          original_table_number: 'Table 101',
        },
      });
    });

    it('reports missing fields and invalid dates without generating a check-in timestamp', () => {
      const [row] = processParsedCsvData({
        headers: ['RFID', 'Date', 'Time_Slot', 'Table'],
        rows: [{ RFID: '', Date: 'not a date', Time_Slot: '', Table: '' }],
      });

      expect(row.row_number).toBe(2);
      expect(row.isValid).toBe(false);
      expect(row.errors).toEqual([
        'RFID is missing',
        'Time_Slot is missing',
        'Invalid Date format: not a date. Expected M/D/YYYY or YYYY-MM-DD',
      ]);
      expect(row.checked_in_at).toBe('');
      expect(row.table_number).toBe(UNASSIGNED_TABLE);
    });

    it('processes rows and maps table > 100 to Usher / Backroom / IMT / VMT preserving original table in metadata', () => {
      const parsed = {
        headers: ['RFID', 'Date', 'Time', 'Time_Slot', 'Table', 'Name', 'Role'],
        rows: [
          {
            RFID: '987654321',
            Date: '3/9/2026',
            Time: '09:00:00',
            Time_Slot: '9AM',
            Table: '105',
            Name: 'Test Usher',
            Role: 'Usher',
          },
          {
            RFID: '123456789',
            Date: '3/9/2026',
            Time: '09:00:00',
            Time_Slot: '9AM',
            Table: '42',
            Name: 'Test Attendee',
            Role: 'Attendee',
          },
        ],
      };

      const result = processParsedCsvData(parsed);
      expect(result).toHaveLength(2);

      // Row 1 (Table 105 -> Usher / Backroom / IMT / VMT)
      expect(result[0].table_number).toBe(USHER_BACKROOM_TABLE);
      expect(result[0].metadata.original_table_number).toBe('105');
      expect(result[0].metadata.role).toBe('Usher');
      expect(result[0].service_date).toBe('2026-03-09');
      expect(result[0].checked_in_at).toBe('2026-03-09T09:00:00+08:00');

      // Row 2 (Table 42 -> 42)
      expect(result[1].table_number).toBe('42');
      expect(result[1].metadata.original_table_number).toBeUndefined();
    });

    it('correctly parses Walkin field variations and values', () => {
      const parsed = {
        headers: ['RFID', 'Date', 'Time', 'Time_Slot', 'Table', 'Walkin'],
        rows: [
          {
            RFID: '1763462678',
            Date: '1/4/26',
            Time: '09:45:43',
            Time_Slot: '9AM',
            Table: '22',
            Walkin: 'TRUE',
          },
          {
            RFID: '1763462679',
            Date: '1/4/26',
            Time: '09:45:43',
            Time_Slot: '9AM',
            Table: '23',
            Walkin: '0',
          },
          {
            RFID: '1763462680',
            Date: '1/4/26',
            Time: '09:45:43',
            Time_Slot: '9AM',
            Table: '24',
            Walkin: '1',
          },
          {
            RFID: '1763462681',
            Date: '1/4/26',
            Time: '09:45:43',
            Time_Slot: '9AM',
            Table: '25',
            Walkin: '',
          },
        ],
      };

      const result = processParsedCsvData(parsed);
      expect(result[0].is_walk_in).toBe(true);
      expect(result[1].is_walk_in).toBe(false);
      expect(result[2].is_walk_in).toBe(true);
      expect(result[3].is_walk_in).toBe(false);
    });

    it('maps blank or X tables to Unassigned and does not produce validation error', () => {
      const parsed = {
        headers: ['RFID', 'Date', 'Time', 'Time_Slot', 'Table'],
        rows: [
          {
            RFID: '1763462678',
            Date: '1/4/26',
            Time: '09:45:43',
            Time_Slot: '9AM',
            Table: '',
          },
          {
            RFID: '1763462679',
            Date: '1/4/26',
            Time: '09:45:43',
            Time_Slot: '9AM',
            Table: 'X',
          },
          {
            RFID: '1763462680',
            Date: '1/4/26',
            Time: '09:45:43',
            Time_Slot: '9AM',
            Table: 'x',
          },
        ],
      };

      const result = processParsedCsvData(parsed);
      expect(result[0].table_number).toBe(UNASSIGNED_TABLE);
      expect(result[0].isValid).toBe(true);
      expect(result[0].errors).toEqual([]);

      expect(result[1].table_number).toBe(UNASSIGNED_TABLE);
      expect(result[1].metadata.original_table_number).toBe('X');
      expect(result[1].isValid).toBe(true);

      expect(result[2].table_number).toBe(UNASSIGNED_TABLE);
      expect(result[2].metadata.original_table_number).toBe('x');
      expect(result[2].isValid).toBe(true);
    });

    it('handles various date formats (YYYY-MM-DD, M/D/YYYY, MM/DD/YYYY, ISO, etc.)', () => {
      const parsed = {
        headers: ['RFID', 'Date', 'Time', 'Time_Slot', 'Table'],
        rows: [
          { RFID: '1', Date: '2026-03-15', Time: '09:00:00', Time_Slot: '9AM', Table: '1' },
          { RFID: '2', Date: '3/15/2026', Time: '09:00:00', Time_Slot: '9AM', Table: '2' },
          { RFID: '3', Date: '03/15/26', Time: '09:00:00', Time_Slot: '9AM', Table: '3' },
          { RFID: '4', Date: '2026/3/15', Time: '09:00:00', Time_Slot: '9AM', Table: '4' },
          {
            RFID: '5',
            Date: '2026-03-15T00:00:00.000Z',
            Time: '09:00:00',
            Time_Slot: '9AM',
            Table: '5',
          },
        ],
      };

      const result = processParsedCsvData(parsed);
      for (const row of result) {
        expect(row.service_date).toBe('2026-03-15');
        expect(row.isValid).toBe(true);
      }
    });

    it('normalizes header variations like "Time Slot" and "Table Number"', () => {
      const parsed = {
        headers: ['RFID', 'Date', 'Time', 'Time Slot', 'Table Number'],
        rows: [
          {
            RFID: '123',
            Date: '2026-03-15',
            Time: '09:00:00',
            'Time Slot': '9AM',
            'Table Number': '10',
          },
        ],
      };

      const result = processParsedCsvData(parsed);
      expect(result[0].time_slot).toBe('9AM');
      expect(result[0].table_number).toBe('10');
      expect(result[0].isValid).toBe(true);
    });
  });
});
