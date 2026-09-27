import * as XLSX from 'xlsx';

import type { ParseServiceAttendanceCsvResult } from './csv-parser';

export async function parseServiceAttendanceXlsx(
  file: File,
  walkinSheetName: string,
): Promise<ParseServiceAttendanceCsvResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    if (workbook.SheetNames.length === 0) {
      return { success: false, error: 'XLSX file is empty.' };
    }

    const allDataRows: Record<string, string>[] = [];
    let headers: string[] = [];

    // The logic below assumes all sheets should be processed and combined,
    // as per user instructions
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      // sheet_to_json with defval: '' guarantees all expected keys exist even if cell is empty
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false }) as Record<
        string,
        unknown
      >[];

      if (sheetData.length === 0) continue;

      if (headers.length === 0) {
        // Extract headers from the first non-empty sheet
        headers = Object.keys(sheetData[0]).map((h) => h.trim());
      }

      const isWalkinSheet =
        walkinSheetName && sheetName.trim().toLowerCase() === walkinSheetName.trim().toLowerCase();

      for (const rawRow of sheetData) {
        const rowData: Record<string, string> = {};

        for (const [key, value] of Object.entries(rawRow)) {
          rowData[key.trim()] = String(value).trim();
        }

        // If the current sheet matches the walkinSheetName config, mark row as walkin
        if (isWalkinSheet) {
          rowData['Walkin'] = '1';
        }

        allDataRows.push(rowData);
      }
    }

    if (allDataRows.length === 0) {
      return { success: false, error: 'XLSX file contains no data rows.' };
    }

    const REQUIRED_HEADERS = ['RFID', 'Date', 'Time', 'Time_Slot', 'Table'];
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return {
        success: false,
        error: `Missing required headers in XLSX: ${missingHeaders.join(', ')}`,
      };
    }

    return {
      success: true,
      data: {
        headers,
        rows: allDataRows,
      },
    };
  } catch (error) {
    console.error('Failed to parse XLSX file:', error);
    return { success: false, error: 'Failed to read or parse the XLSX file.' };
  }
}
