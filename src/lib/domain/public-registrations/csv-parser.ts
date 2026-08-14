import type { AdminEventField } from '@/lib/domain/event-fields';

export type ParsedPublicRegistrationCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ParsePublicRegistrationCsvResult =
  | { success: true; data: ParsedPublicRegistrationCsv }
  | { success: false; error: string };

export type BulkPublicRegistrationCsvRowInput = {
  first_name: string;
  last_name: string;
  nickname?: string;
  email: string;
  phone?: string;
  public_registration_id?: string;
  answers: Record<string, unknown>;
};

export type BuildBulkPublicRegistrationRowsResult = {
  rows: BulkPublicRegistrationCsvRowInput[];
  errors: string[];
};

const REQUIRED_HEADERS = ['first_name', 'last_name', 'email'] as const;

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

export function parsePublicRegistrationCsvText(csvText: string): ParsePublicRegistrationCsvResult {
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

function parseAnswerByFieldType(field: AdminEventField, rawValue: string): unknown {
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

export function buildBulkPublicRegistrationRowsFromCsv(
  csvRows: Record<string, string>[],
  fields: AdminEventField[],
  includedFieldKeys?: string[],
): BuildBulkPublicRegistrationRowsResult {
  const rows: BulkPublicRegistrationCsvRowInput[] = [];
  const errors: string[] = [];
  const includedFieldKeySet = new Set(includedFieldKeys ?? fields.map((field) => field.field_key));

  for (let index = 0; index < csvRows.length; index += 1) {
    const csvRow = csvRows[index];
    const rowNumber = index + 2;

    const firstName = (csvRow.first_name ?? '').trim();
    const lastName = (csvRow.last_name ?? '').trim();
    const email = (csvRow.email ?? '').trim();

    if (firstName.length === 0) {
      errors.push(`Row ${rowNumber}: first_name is required.`);
      continue;
    }

    if (lastName.length === 0) {
      errors.push(`Row ${rowNumber}: last_name is required.`);
      continue;
    }

    if (email.length === 0) {
      errors.push(`Row ${rowNumber}: email is required.`);
      continue;
    }

    const answers: Record<string, unknown> = {};
    for (const field of fields) {
      if (!includedFieldKeySet.has(field.field_key)) {
        continue;
      }

      answers[field.field_key] = parseAnswerByFieldType(field, csvRow[field.field_key] ?? '');
    }

    rows.push({
      first_name: firstName,
      last_name: lastName,
      nickname: (csvRow.nickname ?? '').trim() || undefined,
      email,
      phone: (csvRow.phone ?? '').trim() || undefined,
      public_registration_id: (csvRow.public_registration_id ?? '').trim() || undefined,
      answers,
    });
  }

  return { rows, errors };
}
