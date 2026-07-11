import type { AttendanceField } from '@/lib/domain/attendance-fields';

import type { BulkAttendanceCsvRowInput } from './schemas';

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ParseCsvResult = { success: true; data: ParsedCsv } | { success: false; error: string };

export type BuildBulkRowsResult = {
  rows: BulkAttendanceCsvRowInput[];
  errors: string[];
};

const REQUIRED_HEADERS = ['attendee_kind', 'registration_id', 'public_registration_id'] as const;

function finalizeCsvCell(value: string): string {
  return value.trim();
}

function parseCsvTextToRows(csvText: string): string[][] {
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
        index += 1;
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
        index += 1;
      }

      currentRow.push(finalizeCsvCell(currentCell));
      currentCell = '';

      const hasAnyValue = currentRow.some((cell) => cell.length > 0);
      if (hasAnyValue) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted value in CSV line.');
  }

  currentRow.push(finalizeCsvCell(currentCell));
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function parseCsvText(csvText: string): ParseCsvResult {
  const normalizedText = csvText.trim();
  if (!normalizedText) {
    return { success: false, error: 'CSV file is empty.' };
  }

  let parsedRows: string[][];
  try {
    parsedRows = parseCsvTextToRows(normalizedText);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse CSV file.',
    };
  }

  if (parsedRows.length < 2) {
    return {
      success: false,
      error: 'CSV must include one header row and at least one data row.',
    };
  }

  const headers = parsedRows[0];

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return {
      success: false,
      error: `CSV is missing required header(s): ${missingHeaders.join(', ')}.`,
    };
  }

  const rows: Record<string, string>[] = [];

  for (let rowIndex = 1; rowIndex < parsedRows.length; rowIndex += 1) {
    const cells = parsedRows[rowIndex];

    if (cells.length !== headers.length) {
      return {
        success: false,
        error: `Row ${rowIndex + 1} has ${cells.length} column(s); expected ${headers.length}.`,
      };
    }

    const rowObject = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {});

    rows.push(rowObject);
  }

  return {
    success: true,
    data: { headers, rows },
  };
}

function parseBooleanValue(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
  if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  return null;
}

function splitList(value: string): string[] {
  return value
    .split(/[|;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseAnswerByFieldType(field: AttendanceField, rawValue: string): unknown {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (field.field_type === 'number') {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : trimmed;
  }

  if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
    const parsed = parseBooleanValue(trimmed);
    return parsed ?? trimmed;
  }

  if (field.field_type === 'multi_select') {
    return splitList(trimmed);
  }

  if (field.field_type === 'multi_select_toggle') {
    const parts = splitList(trimmed);
    const parsedPairs: Record<string, boolean> = {};

    for (const part of parts) {
      const separatorIndex = part.indexOf(':');
      if (separatorIndex <= 0) {
        return trimmed;
      }

      const key = part.slice(0, separatorIndex).trim();
      const boolText = part.slice(separatorIndex + 1).trim();
      const boolValue = parseBooleanValue(boolText);

      if (!key || boolValue === null) {
        return trimmed;
      }

      parsedPairs[key] = boolValue;
    }

    return parsedPairs;
  }

  return trimmed;
}

export function buildBulkAttendanceRowsFromCsv(
  csvRows: Record<string, string>[],
  fields: AttendanceField[],
): BuildBulkRowsResult {
  const rows: BulkAttendanceCsvRowInput[] = [];
  const errors: string[] = [];

  for (let index = 0; index < csvRows.length; index += 1) {
    const csvRow = csvRows[index];
    const rowNumber = index + 2;

    const attendeeKindRaw = (csvRow.attendee_kind ?? '').trim().toLowerCase();
    const registrationId = (csvRow.registration_id ?? '').trim();
    const publicRegistrationId = (csvRow.public_registration_id ?? '').trim();

    if (attendeeKindRaw !== 'registered' && attendeeKindRaw !== 'public') {
      errors.push(`Row ${rowNumber}: attendee_kind must be either registered or public.`);
      continue;
    }

    if (attendeeKindRaw === 'registered' && registrationId.length === 0) {
      errors.push(`Row ${rowNumber}: registration_id is required for registered attendees.`);
      continue;
    }

    if (attendeeKindRaw === 'public' && publicRegistrationId.length === 0) {
      errors.push(`Row ${rowNumber}: public_registration_id is required for public attendees.`);
      continue;
    }

    const answers: Record<string, unknown> = {};
    for (const field of fields) {
      answers[field.field_key] = parseAnswerByFieldType(field, csvRow[field.field_key] ?? '');
    }

    rows.push({
      attendee_kind: attendeeKindRaw,
      registration_id: attendeeKindRaw === 'registered' ? registrationId : undefined,
      public_registration_id: attendeeKindRaw === 'public' ? publicRegistrationId : undefined,
      answers,
    });
  }

  return { rows, errors };
}
