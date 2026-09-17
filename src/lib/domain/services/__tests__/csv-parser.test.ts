import { describe, expect, it } from 'vitest';

import {
  UNASSIGNED_TABLE,
  USHER_BACKROOM_TABLE,
  mapServiceAttendanceTableNumber,
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

    it('maps numbers strictly greater than 100 to Usher / Backroom', () => {
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
      expect(mapServiceAttendanceTableNumber('Usher / Backroom')).toBe('Usher / Backroom');
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
  });

  describe('parseServiceAttendanceCsv', () => {
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

  describe('processParsedCsvData', () => {
    it('processes rows and maps table > 100 to Usher / Backroom preserving original table in metadata', () => {
      const parsed = {
        headers: ['RFID', 'Date', 'Time', 'Time_Slot', 'Table', 'Name', 'Role'],
        rows: [
          {
            RFID: '987654321',
            Date: '3/9/2026',
            Time: '09:00:00',
            Time_Slot: '9AM',
            Table: '105',
            Name: 'John Doe',
            Role: 'Usher',
          },
          {
            RFID: '123456789',
            Date: '3/9/2026',
            Time: '09:00:00',
            Time_Slot: '9AM',
            Table: '42',
            Name: 'Jane Smith',
            Role: 'Attendee',
          },
        ],
      };

      const result = processParsedCsvData(parsed);
      expect(result).toHaveLength(2);

      // Row 1 (Table 105 -> Usher / Backroom)
      expect(result[0].table_number).toBe(USHER_BACKROOM_TABLE);
      expect(result[0].metadata.original_table_number).toBe('105');
      expect(result[0].metadata.role).toBe('Usher');
      expect(result[0].service_date).toBe('2026-03-09');

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
  });
});
