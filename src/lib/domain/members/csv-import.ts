import { VALIDATION_PATTERNS } from '@/config/constants';

export type ParsedMemberCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ParseMemberCsvResult =
  | { success: true; data: ParsedMemberCsv }
  | { success: false; error: string };

export interface MemberCsvPreparedRowInput {
  row_number: number;
  member_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  metadata: Record<string, unknown>;
}

export interface ExistingMemberImportSnapshot {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  is_active: boolean;
}

export type MemberCsvPreviewOperation = 'insert' | 'update' | 'update_member_id' | 'error';

export interface MemberCsvPreviewRow {
  row_number: number;
  member_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  operation: MemberCsvPreviewOperation;
  target_user_id?: string;
  target_member_id?: string;
  errors: string[];
}

export interface MemberCsvPreviewSummary {
  total_rows: number;
  insert_count: number;
  update_count: number;
  update_member_id_count: number;
  error_count: number;
}

export interface BuildMemberCsvPreparedRowsResult {
  rows: MemberCsvPreparedRowInput[];
  errors: string[];
}

export interface BuildMemberCsvImportPreviewResult {
  rows: MemberCsvPreviewRow[];
  summary: MemberCsvPreviewSummary;
}

const MEMBER_ID_ALIASES = ['rfid', 'memberid', 'member_id'];
const FIRST_NAME_ALIASES = ['firstname', 'first_name', 'first'];
const LAST_NAME_ALIASES = ['surname', 'lastname', 'last_name', 'last'];
const NICKNAME_ALIASES = ['nickname', 'nick_name', 'nick'];
const EMAIL_ALIASES = ['email', 'email_address'];
const PHONE_ALIASES = ['phone', 'phone_number', 'mobile', 'contact_number'];
const DATE_OF_BIRTH_ALIASES = ['dateofbirth', 'date_of_birth', 'dob', 'birthdate'];

const CORE_FIELDS = new Set([
  'member_id',
  'first_name',
  'last_name',
  'nickname',
  'email',
  'phone',
  'date_of_birth',
]);

function normalizeLookupHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeMetadataHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeTriplet(firstName: string, lastName: string, nickname: string): string {
  return [firstName, lastName, nickname]
    .map((value) => normalizeText(value).toLowerCase())
    .join('|');
}

function resolveCoreField(
  header: string,
): keyof Omit<MemberCsvPreparedRowInput, 'row_number' | 'metadata'> | null {
  const key = normalizeLookupHeaderKey(header);

  if (MEMBER_ID_ALIASES.includes(key)) return 'member_id';
  if (FIRST_NAME_ALIASES.includes(key)) return 'first_name';
  if (LAST_NAME_ALIASES.includes(key)) return 'last_name';
  if (NICKNAME_ALIASES.includes(key)) return 'nickname';
  if (EMAIL_ALIASES.includes(key)) return 'email';
  if (PHONE_ALIASES.includes(key)) return 'phone';
  if (DATE_OF_BIRTH_ALIASES.includes(key)) return 'date_of_birth';

  return null;
}

function parseBooleanLike(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
  return null;
}

function toMetadataValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const boolValue = parseBooleanLike(trimmed);
  if (boolValue !== null) {
    return boolValue;
  }

  return trimmed;
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
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      currentCell = '';

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted value in CSV.');
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function parseMemberCsvText(csvText: string): ParseMemberCsvResult {
  const normalized = csvText.trim();
  if (!normalized) {
    return { success: false, error: 'CSV file is empty.' };
  }

  let parsedRows: string[][];
  try {
    parsedRows = parseCsvTextToRows(normalized);
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
  const normalizedHeaders = headers.map((header) => normalizeMetadataHeaderKey(header));
  const duplicateHeaders = normalizedHeaders.filter(
    (header, index) => header.length > 0 && normalizedHeaders.indexOf(header) !== index,
  );

  if (duplicateHeaders.length > 0) {
    return {
      success: false,
      error: `CSV has duplicate header(s): ${Array.from(new Set(duplicateHeaders)).join(', ')}.`,
    };
  }

  const rows: Record<string, string>[] = [];
  for (let index = 1; index < parsedRows.length; index += 1) {
    const cells = parsedRows[index];
    if (cells.length !== headers.length) {
      return {
        success: false,
        error: `Row ${index + 1} has ${cells.length} column(s); expected ${headers.length}.`,
      };
    }

    const row = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
      acc[header] = cells[headerIndex] ?? '';
      return acc;
    }, {});
    rows.push(row);
  }

  return { success: true, data: { headers, rows } };
}

export function buildMemberCsvPreparedRows(
  csvRows: Record<string, string>[],
): BuildMemberCsvPreparedRowsResult {
  const rows: MemberCsvPreparedRowInput[] = [];
  const errors: string[] = [];

  for (let index = 0; index < csvRows.length; index += 1) {
    const csvRow = csvRows[index];
    const rowNumber = index + 2;

    const prepared: Omit<MemberCsvPreparedRowInput, 'row_number'> = {
      member_id: '',
      first_name: '',
      last_name: '',
      nickname: '',
      email: null,
      phone: null,
      date_of_birth: null,
      metadata: {},
    };

    for (const [header, rawValue] of Object.entries(csvRow)) {
      const coreField = resolveCoreField(header);
      const normalized = normalizeText(rawValue);

      if (coreField) {
        if (coreField === 'email' || coreField === 'phone' || coreField === 'date_of_birth') {
          prepared[coreField] = normalized.length > 0 ? normalized : null;
        } else {
          prepared[coreField] = normalized;
        }
        continue;
      }

      const metadataKey = normalizeMetadataHeaderKey(header);
      if (!metadataKey || CORE_FIELDS.has(metadataKey)) {
        continue;
      }

      const metadataValue = toMetadataValue(rawValue);
      if (metadataValue !== null) {
        prepared.metadata[metadataKey] = metadataValue;
      }
    }

    if (!prepared.member_id) {
      errors.push(`Row ${rowNumber}: RFID/Member ID is required.`);
    }
    if (!prepared.first_name) {
      errors.push(`Row ${rowNumber}: Firstname is required.`);
    }
    if (!prepared.last_name) {
      errors.push(`Row ${rowNumber}: Surname is required.`);
    }
    if (!prepared.nickname) {
      errors.push(`Row ${rowNumber}: Nickname is required.`);
    }

    if (prepared.email && !VALIDATION_PATTERNS.email.test(prepared.email)) {
      errors.push(`Row ${rowNumber}: Email is invalid.`);
    }

    if (prepared.date_of_birth && !VALIDATION_PATTERNS.dateYyyyMmDd.test(prepared.date_of_birth)) {
      errors.push(`Row ${rowNumber}: Date of birth must use YYYY-MM-DD format.`);
    }

    rows.push({ row_number: rowNumber, ...prepared });
  }

  return { rows, errors };
}

export function buildMemberCsvImportPreview(
  rows: MemberCsvPreparedRowInput[],
  existingMembers: ExistingMemberImportSnapshot[],
): BuildMemberCsvImportPreviewResult {
  const idMap = new Map(existingMembers.map((member) => [normalizeText(member.member_id), member]));
  const tripletMap = new Map<string, ExistingMemberImportSnapshot[]>();

  for (const member of existingMembers) {
    const key = normalizeTriplet(member.first_name, member.last_name, member.nickname);
    const list = tripletMap.get(key) ?? [];
    list.push(member);
    tripletMap.set(key, list);
  }

  const memberIdCounts = new Map<string, number>();
  const tripletCounts = new Map<string, number>();
  for (const row of rows) {
    memberIdCounts.set(row.member_id, (memberIdCounts.get(row.member_id) ?? 0) + 1);
    const key = normalizeTriplet(row.first_name, row.last_name, row.nickname);
    tripletCounts.set(key, (tripletCounts.get(key) ?? 0) + 1);
  }

  const targetedMemberIds = new Set<string>();
  const previewRows: MemberCsvPreviewRow[] = [];

  for (const row of rows) {
    const rowErrors: string[] = [];

    if ((memberIdCounts.get(row.member_id) ?? 0) > 1) {
      rowErrors.push('Member ID appears multiple times in this CSV batch.');
    }

    const rowTripletKey = normalizeTriplet(row.first_name, row.last_name, row.nickname);
    if ((tripletCounts.get(rowTripletKey) ?? 0) > 1) {
      rowErrors.push('Firstname + Surname + Nickname appears multiple times in this CSV batch.');
    }

    const memberIdMatch = idMap.get(row.member_id) ?? null;
    const tripletMatches = tripletMap.get(rowTripletKey) ?? [];

    if (tripletMatches.length > 1) {
      rowErrors.push('Multiple existing members match this name triplet.');
    }

    if (memberIdMatch && tripletMatches.length === 1 && tripletMatches[0].id !== memberIdMatch.id) {
      rowErrors.push(
        'RFID matches one member while Firstname+Surname+Nickname matches a different member.',
      );
    }

    let operation: MemberCsvPreviewOperation = 'insert';
    let targetUserId: string | undefined;
    let targetMemberId: string | undefined;

    if (rowErrors.length > 0) {
      operation = 'error';
    } else if (memberIdMatch) {
      operation = 'update';
      targetUserId = memberIdMatch.id;
      targetMemberId = memberIdMatch.member_id;
    } else if (tripletMatches.length === 1) {
      operation = 'update_member_id';
      targetUserId = tripletMatches[0].id;
      targetMemberId = tripletMatches[0].member_id;
    }

    if (targetUserId) {
      if (targetedMemberIds.has(targetUserId)) {
        operation = 'error';
        rowErrors.push('Another row already targets this same member.');
      }
      targetedMemberIds.add(targetUserId);
    }

    previewRows.push({
      row_number: row.row_number,
      member_id: row.member_id,
      first_name: row.first_name,
      last_name: row.last_name,
      nickname: row.nickname,
      operation,
      target_user_id: targetUserId,
      target_member_id: targetMemberId,
      errors: rowErrors,
    });
  }

  const summary: MemberCsvPreviewSummary = {
    total_rows: previewRows.length,
    insert_count: previewRows.filter((row) => row.operation === 'insert').length,
    update_count: previewRows.filter((row) => row.operation === 'update').length,
    update_member_id_count: previewRows.filter((row) => row.operation === 'update_member_id')
      .length,
    error_count: previewRows.filter((row) => row.operation === 'error').length,
  };

  return { rows: previewRows, summary };
}
