import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { parseServiceAttendanceXlsx } from '../excel-parser';

describe('parseServiceAttendanceXlsx', () => {
  function createMockFile(sheetData: Record<string, unknown>[], sheetName = 'Comm_Attend') {
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new File([buffer], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  function createMockMultiSheetFile(sheets: { name: string; data: Record<string, unknown>[] }[]) {
    const wb = XLSX.utils.book_new();
    for (const sheet of sheets) {
      const ws = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    }
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new File([buffer], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  it('fails if headers are missing', async () => {
    const file = createMockFile([{ BadHeader: 'data' }]);
    const result = await parseServiceAttendanceXlsx(file, {
      sheets: [{ name: 'Comm_Attend', isWalkIn: false }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Missing required headers in XLSX');
    }
  });

  it('parses default sheets (Comm_Attend, OIC_Attend, Walkin_Attend) and marks walkins correctly', async () => {
    const sheets = [
      {
        name: 'Comm_Attend',
        data: [{ RFID: '111', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '10' }],
      },
      {
        name: 'OIC_Attend',
        data: [{ RFID: '222', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '15' }],
      },
      {
        name: 'Walkin_Attend',
        data: [{ RFID: '333', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '20' }],
      },
      {
        name: 'Unrelated_Sheet',
        data: [{ RFID: '999', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '99' }],
      },
    ];

    const file = createMockMultiSheetFile(sheets);
    const result = await parseServiceAttendanceXlsx(file);

    expect(result.success).toBe(true);
    if (result.success) {
      // 3 matching sheets parsed, Unrelated_Sheet skipped
      expect(result.data.rows).toHaveLength(3);
      expect(result.data.rows[0].RFID).toBe('111');
      expect(result.data.rows[0].Walkin).toBeUndefined();

      expect(result.data.rows[1].RFID).toBe('222');
      expect(result.data.rows[1].Walkin).toBeUndefined();

      expect(result.data.rows[2].RFID).toBe('333');
      expect(result.data.rows[2].Walkin).toBe('1');
    }
  });

  it('gracefully handles missing configured sheets if other configured sheets exist', async () => {
    const sheets = [
      {
        name: 'Comm_Attend',
        data: [{ RFID: '111', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '10' }],
      },
    ];

    const file = createMockMultiSheetFile(sheets);
    const result = await parseServiceAttendanceXlsx(file, {
      sheets: [
        { name: 'Comm_Attend', isWalkIn: false },
        { name: 'OIC_Attend', isWalkIn: false },
        { name: 'Walkin_Attend', isWalkIn: true },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].RFID).toBe('111');
    }
  });

  it('allows custom sheet names in config', async () => {
    const sheets = [
      {
        name: 'Custom_Comm',
        data: [{ RFID: '101', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '1' }],
      },
      {
        name: 'Custom_Walkin',
        data: [{ RFID: '202', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '2' }],
      },
    ];

    const file = createMockMultiSheetFile(sheets);
    const result = await parseServiceAttendanceXlsx(file, {
      sheets: [
        { name: 'Custom_Comm', isWalkIn: false },
        { name: 'Custom_Walkin', isWalkIn: true },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0].RFID).toBe('101');
      expect(result.data.rows[0].Walkin).toBeUndefined();
      expect(result.data.rows[1].RFID).toBe('202');
      expect(result.data.rows[1].Walkin).toBe('1');
    }
  });

  it('allows dynamic sheets array in config', async () => {
    const sheets = [
      {
        name: 'My_Custom_Sheet',
        data: [{ RFID: '404', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '4' }],
      },
      {
        name: 'My_Walkin_Sheet',
        data: [{ RFID: '505', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '5' }],
      },
    ];

    const file = createMockMultiSheetFile(sheets);
    const result = await parseServiceAttendanceXlsx(file, {
      sheets: [
        { name: 'My_Custom_Sheet', isWalkIn: false },
        { name: 'My_Walkin_Sheet', isWalkIn: true },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0].RFID).toBe('404');
      expect(result.data.rows[0].Walkin).toBeUndefined();
      expect(result.data.rows[1].RFID).toBe('505');
      expect(result.data.rows[1].Walkin).toBe('1');
    }
  });

  it('matches sheet names flexibly ignoring space and underscore differences', async () => {
    const sheets = [
      {
        name: 'Comm Attend', // Has space instead of underscore
        data: [{ RFID: '606', Date: '2026-03-15', Time: '09:00', Time_Slot: '9AM', Table: '6' }],
      },
      {
        name: 'Walkin Attend ', // Has space and trailing space
        data: [{ RFID: '707', Date: '2026-03-15', Time: '09:00', Time_Slot: '9AM', Table: '7' }],
      },
    ];

    const file = createMockMultiSheetFile(sheets);
    const result = await parseServiceAttendanceXlsx(file, {
      sheets: [
        { name: 'Comm_Attend', isWalkIn: false },
        { name: 'Walkin_Attend', isWalkIn: true },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0].RFID).toBe('606');
      expect(result.data.rows[0].Walkin).toBeUndefined();
      expect(result.data.rows[1].RFID).toBe('707');
      expect(result.data.rows[1].Walkin).toBe('1');
    }
  });
});
