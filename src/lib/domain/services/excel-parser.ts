import * as XLSX from 'xlsx';

import { type ParseServiceAttendanceCsvResult, normalizeHeaderKey } from './csv-parser';

export interface ServiceAttendanceSheetConfig {
  name: string;
  isWalkIn?: boolean;
}

export interface ServiceAttendanceXlsxConfig {
  sheets?: ServiceAttendanceSheetConfig[];
}

export async function parseServiceAttendanceXlsx(
  file: File,
  config?: ServiceAttendanceXlsxConfig,
): Promise<ParseServiceAttendanceCsvResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    if (workbook.SheetNames.length === 0) {
      return { success: false, error: 'XLSX file is empty.' };
    }

    const configuredSheets: ServiceAttendanceSheetConfig[] =
      config?.sheets && config.sheets.length > 0
        ? config.sheets
        : [
            { name: 'Comm_Attend', isWalkIn: false },
            { name: 'OIC_Attend', isWalkIn: false },
            { name: 'Walkin_Attend', isWalkIn: true },
          ];

    const allDataRows: Record<string, string>[] = [];
    let headers: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheetNameLower = sheetName.trim().toLowerCase();

      const matchedConfig = configuredSheets.find((s) => {
        const configuredName = s.name.trim().toLowerCase();
        if (!configuredName) return false;
        if (configuredName === sheetNameLower) return true;
        const clean = (str: string) => str.replace(/[\s_-]+/g, '');
        return clean(configuredName) === clean(sheetNameLower);
      });

      // If sheet doesn't match any configured sheet, skip it
      if (!matchedConfig) {
        continue;
      }

      const worksheet = workbook.Sheets[sheetName];
      // sheet_to_json with defval: '' guarantees all expected keys exist even if cell is empty
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false }) as Record<
        string,
        unknown
      >[];

      if (sheetData.length === 0) continue;

      if (headers.length === 0) {
        // Extract headers from the first non-empty matching sheet
        headers = Object.keys(sheetData[0]).map((h) => normalizeHeaderKey(h));
      }

      for (const rawRow of sheetData) {
        const rowData: Record<string, string> = {};

        for (const [key, value] of Object.entries(rawRow)) {
          const normalizedKey = normalizeHeaderKey(key);
          if (value instanceof Date) {
            const y = value.getUTCFullYear();
            const m = String(value.getUTCMonth() + 1).padStart(2, '0');
            const d = String(value.getUTCDate()).padStart(2, '0');
            rowData[normalizedKey] = `${y}-${m}-${d}`;
          } else {
            rowData[normalizedKey] = String(value ?? '').trim();
          }
        }

        // If the current sheet is marked as walkin, set Walkin = '1'
        if (matchedConfig.isWalkIn) {
          rowData['Walkin'] = '1';
        }

        allDataRows.push(rowData);
      }
    }

    if (allDataRows.length === 0) {
      return { success: false, error: 'XLSX file contains no matching sheet data rows.' };
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
