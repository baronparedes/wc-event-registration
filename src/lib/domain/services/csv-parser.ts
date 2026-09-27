export type ParsedServiceAttendanceCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ParseServiceAttendanceCsvResult =
  | { success: true; data: ParsedServiceAttendanceCsv }
  | { success: false; error: string };

function finalizeCsvCell(value: string): string {
  return value.trim();
}

export function parseCsvTextToRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1; // Skip the escaped quote
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(finalizeCsvCell(currentCell));
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1; // Skip the \n part of \r\n
      }

      currentRow.push(finalizeCsvCell(currentCell));
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  // Handle the last cell/row if not terminated by a newline
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(finalizeCsvCell(currentCell));
    rows.push(currentRow);
  }

  // Remove empty rows at the end of the file
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell === '')) {
    rows.pop();
  }

  return rows;
}

export function parseServiceAttendanceCsv(csvText: string): ParseServiceAttendanceCsvResult {
  const rows = parseCsvTextToRows(csvText);

  if (rows.length < 2) {
    return { success: false, error: 'CSV file is empty or missing data rows.' };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) => h.trim());

  if (headers.length === 0) {
    return { success: false, error: 'CSV headers could not be read.' };
  }

  const REQUIRED_HEADERS = ['RFID', 'Date', 'Time', 'Time_Slot', 'Table'];
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    return {
      success: false,
      error: `Missing required CSV headers: ${missingHeaders.join(', ')}`,
    };
  }

  const dataRows: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely empty rows
    if (row.every((cell) => cell === '')) {
      continue;
    }

    const rowData: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      rowData[headers[j]] = row[j] ?? '';
    }
    dataRows.push(rowData);
  }

  return { success: true, data: { headers, rows: dataRows } };
}

export interface ServiceAttendanceCsvPreviewRow {
  row_number: number;
  originalData: Record<string, string>;
  isValid: boolean;
  errors: string[];
  // Transformed fields
  rfid: string;
  service_date: string;
  time_slot: string;
  checked_in_at: string;
  is_manual_entry: boolean;
  is_override: boolean;
  is_walk_in: boolean;
  table_number: string;
  metadata: Record<string, unknown>;
  // Looked up fields (will be populated during preview phase by React component)
  user_id?: string;
  service_seat_id?: string;
  member_name?: string;
}

export const USHER_BACKROOM_TABLE = 'Usher / Backroom / IMT / VMT';
export const UNASSIGNED_TABLE = 'Unassigned';

export function mapServiceAttendanceTableNumber(tableInput: string): string {
  const trimmed = tableInput.trim();
  if (!trimmed || trimmed.toLowerCase() === 'x') {
    return UNASSIGNED_TABLE;
  }

  const parsed = Number(trimmed.replace(/^table\s*/i, '').trim());
  if (!Number.isNaN(parsed) && parsed > 100) {
    return USHER_BACKROOM_TABLE;
  }
  return trimmed;
}

export function normalizeHeaderKey(key: string): string {
  const trimmed = key.trim();
  const lower = trimmed.toLowerCase().replace(/[\s_-]+/g, '');
  if (lower === 'rfid' || lower === 'memberid') return 'RFID';
  if (lower === 'date' || lower === 'servicedate') return 'Date';
  if (lower === 'time' || lower === 'checkintime') return 'Time';
  if (lower === 'timeslot') return 'Time_Slot';
  if (lower === 'table' || lower === 'tablenumber' || lower === 'table#') return 'Table';
  if (lower === 'name' || lower === 'fullname' || lower === 'membername') return 'Name';
  if (lower === 'role') return 'Role';
  if (lower === 'walkin' || lower === 'iswalkin') return 'Walkin';
  if (lower === 'manualentry' || lower === 'ismanualentry') return 'Manual_Entry';
  if (lower === 'override' || lower === 'isoverride') return 'Override';
  if (lower === 'volunteerid') return 'VolunteerID';
  return trimmed;
}

export function normalizeDateToYYYYMMDD(dateInput: unknown): string | null {
  if (!dateInput) return null;

  if (dateInput instanceof Date) {
    if (Number.isNaN(dateInput.getTime())) return null;
    const year = dateInput.getUTCFullYear();
    const month = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(dateInput).trim();
  if (!str) return null;

  // 1. Direct YYYY-MM-DD or YYYY-M-D (e.g. "2026-03-15", "2026-3-9", "2026-03-15T00:00:00.000Z")
  const ymdDashMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str);
  if (ymdDashMatch) {
    const year = ymdDashMatch[1];
    const month = ymdDashMatch[2].padStart(2, '0');
    const day = ymdDashMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. YYYY/MM/DD or YYYY/M/D (e.g. "2026/03/15", "2026/3/9")
  const ymdSlashMatch = /^(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(str);
  if (ymdSlashMatch) {
    const year = ymdSlashMatch[1];
    const month = ymdSlashMatch[2].padStart(2, '0');
    const day = ymdSlashMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 3. M/D/YYYY, MM/DD/YYYY, M/D/YY, MM/DD/YY (e.g. "3/15/2026", "03/15/2026", "3/15/26")
  const mdySlashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(str);
  if (mdySlashMatch) {
    const month = mdySlashMatch[1].padStart(2, '0');
    const day = mdySlashMatch[2].padStart(2, '0');
    let year = mdySlashMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // 4. M-D-YYYY, MM-DD-YYYY, M-D-YY (e.g. "3-15-2026", "03-15-2026")
  const mdyDashMatch = /^(\d{1,2})-(\d{1,2})-(\d{2,4})/.exec(str);
  if (mdyDashMatch) {
    const month = mdyDashMatch[1].padStart(2, '0');
    const day = mdyDashMatch[2].padStart(2, '0');
    let year = mdyDashMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // 5. Excel numeric serial date (e.g. 45731)
  const numVal = Number(str);
  if (!Number.isNaN(numVal) && numVal > 30000 && numVal < 70000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateFromSerial = new Date(excelEpoch.getTime() + numVal * 86400000);
    const year = dateFromSerial.getUTCFullYear();
    const month = String(dateFromSerial.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateFromSerial.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 6. Generic Date fallback (e.g. "Sun Mar 15 2026")
  const parsedDate = new Date(str);
  if (!Number.isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function processParsedCsvData(
  parsedData: ParsedServiceAttendanceCsv,
): ServiceAttendanceCsvPreviewRow[] {
  const previewRows: ServiceAttendanceCsvPreviewRow[] = [];

  for (let i = 0; i < parsedData.rows.length; i++) {
    const rawRow = parsedData.rows[i];
    // Normalize keys in rowData
    const rowData: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawRow)) {
      rowData[normalizeHeaderKey(k)] = v;
    }

    const errors: string[] = [];
    const rfid = rowData['RFID']?.trim() ?? '';
    const dateStr = rowData['Date']?.trim() ?? '';
    const timeStr = rowData['Time']?.trim() ?? '';
    const timeSlot = rowData['Time_Slot']?.trim() ?? '';
    const rawTableNum = rowData['Table']?.trim() ?? '';
    const tableNum = mapServiceAttendanceTableNumber(rawTableNum);

    if (!rfid) {
      errors.push('RFID is missing');
    }
    if (!dateStr) {
      errors.push('Date is missing');
    }
    if (!timeSlot) {
      errors.push('Time_Slot is missing');
    }
    if (!tableNum) {
      errors.push('Table is missing');
    }

    const serviceDate = normalizeDateToYYYYMMDD(dateStr);
    if (dateStr && !serviceDate) {
      errors.push(`Invalid Date format: ${dateStr}. Expected M/D/YYYY or YYYY-MM-DD`);
    }

    let checkedInAt = '';
    if (serviceDate && timeStr) {
      checkedInAt = `${serviceDate}T${timeStr}+08:00`;
    }

    const metadata: Record<string, unknown> = {};
    if (rowData['Role']) metadata.role = rowData['Role'];
    if (rowData['VolunteerID']) metadata.volunteer_id = rowData['VolunteerID'];
    if (rowData['Id']) metadata.legacy_id = rowData['Id'];
    if (rowData['Name']) metadata.legacy_name = rowData['Name'];
    if (
      (tableNum === USHER_BACKROOM_TABLE && rawTableNum !== USHER_BACKROOM_TABLE) ||
      (tableNum === UNASSIGNED_TABLE && rawTableNum !== UNASSIGNED_TABLE && rawTableNum !== '')
    ) {
      metadata.original_table_number = rawTableNum;
    }

    const isManualEntry =
      rowData['Manual_Entry'] === '1' || rowData['Manual_Entry']?.toLowerCase() === 'true';
    const isOverride = rowData['Override'] === '1' || rowData['Override']?.toLowerCase() === 'true';
    const walkInVal =
      rowData['Walkin'] ??
      rowData['Walk_In'] ??
      rowData['Walk-In'] ??
      rowData['Walk In'] ??
      rowData['Is_Walk_In'];
    const isWalkIn =
      walkInVal === '1' ||
      walkInVal?.toLowerCase() === 'true' ||
      walkInVal?.toLowerCase() === 'yes' ||
      walkInVal?.toLowerCase() === 'y';

    previewRows.push({
      row_number: i + 2, // 1-based, +1 for header
      originalData: rowData,
      isValid: errors.length === 0,
      errors,
      rfid,
      service_date: serviceDate ?? '',
      time_slot: timeSlot,
      checked_in_at: checkedInAt,
      is_manual_entry: isManualEntry,
      is_override: isOverride,
      is_walk_in: isWalkIn,
      table_number: tableNum,
      metadata,
    });
  }

  return previewRows;
}
