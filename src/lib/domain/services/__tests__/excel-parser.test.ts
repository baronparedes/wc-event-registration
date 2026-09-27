import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { parseServiceAttendanceXlsx } from '../excel-parser';

describe('parseServiceAttendanceXlsx', () => {
  function createMockFile(sheetData: Record<string, unknown>[], sheetName = 'Sheet1') {
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
    const result = await parseServiceAttendanceXlsx(file, 'Walkin');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Missing required headers in XLSX');
    }
  });

  it('parses valid sheet data and marks walkins correctly for walkin sheet', async () => {
    const sheets = [
      {
        name: 'Sheet1',
        data: [{ RFID: '111', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '10' }],
      },
      {
        name: 'Walkin',
        data: [{ RFID: '222', Date: '3/9/2026', Time: '9:00', Time_Slot: '9AM', Table: '20' }],
      },
    ];

    const file = createMockMultiSheetFile(sheets);
    const result = await parseServiceAttendanceXlsx(file, 'Walkin');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0].RFID).toBe('111');
      expect(result.data.rows[0].Walkin).toBeUndefined(); // Or falsy

      expect(result.data.rows[1].RFID).toBe('222');
      expect(result.data.rows[1].Walkin).toBe('1');
    }
  });
});
