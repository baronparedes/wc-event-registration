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

export const USHER_BACKROOM_TABLE = 'Usher / Backroom';
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

export function processParsedCsvData(
  parsedData: ParsedServiceAttendanceCsv,
): ServiceAttendanceCsvPreviewRow[] {
  const previewRows: ServiceAttendanceCsvPreviewRow[] = [];

  for (let i = 0; i < parsedData.rows.length; i++) {
    const rowData = parsedData.rows[i];
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

    let serviceDate = '';
    if (dateStr) {
      // Expect M/D/YY or M/D/YYYY from Excel, convert to YYYY-MM-DD
      const dateParts = dateStr.split('/');
      if (dateParts.length === 3) {
        let year = dateParts[2];
        if (year.length === 2) {
          year = `20${year}`;
        }
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        serviceDate = `${year}-${month}-${day}`;
      } else {
        errors.push(`Invalid Date format: ${dateStr}. Expected M/D/YYYY`);
      }
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
      service_date: serviceDate,
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
