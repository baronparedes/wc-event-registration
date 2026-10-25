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
  role: string;
  category: string;
  metadata: Record<string, unknown>;
}

export interface ExistingMemberImportSnapshot {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  is_active: boolean;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  role?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type MemberCsvPreviewOperation = 'insert' | 'update' | 'update_member_id' | 'error';

export interface MemberCsvFieldChange {
  field: string;
  label: string;
  old_value: string | null;
  new_value: string | null;
}

export interface MemberCsvNewDetail {
  field: string;
  label: string;
  value: string;
}

export interface MemberCsvPreviewRow {
  row_number: number;
  member_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  role: string;
  category: string;
  operation: MemberCsvPreviewOperation;
  target_user_id?: string;
  target_member_id?: string;
  errors: string[];
  field_changes: MemberCsvFieldChange[];
  new_member_details: MemberCsvNewDetail[];
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
  const matches = value.toLowerCase().match(/[a-z0-9]+/g);
  return matches ? matches.join('_') : '';
}

function canonicalizeMetadataHeaderKey(value: string): string {
  switch (value) {
    case 'isoic':
      return 'is_oic';
    case 'startdate':
    case 'start_date':
    case 'date_joined':
    case 'datejoined':
    case 'joined_date':
    case 'joineddate':
      return 'start_date';
    case '1st_sunday':
    case '1stsunday':
      return 'first_sunday';
    case '2nd_sunday':
    case '2ndsunday':
      return 'second_sunday';
    case '3rd_sunday':
    case '3rdsunday':
      return 'third_sunday';
    case '4th_sunday':
    case '4thsunday':
      return 'fourth_sunday';
    case '5th_sunday':
    case '5thsunday':
      return 'fifth_sunday';
    default:
      return value;
  }
}

const FIELD_LABELS: Record<string, string> = {
  member_id: 'RFID / Member ID',
  first_name: 'First Name',
  last_name: 'Last Name',
  nickname: 'Nickname',
  role: 'Role',
  category: 'Category',
  email: 'Email',
  phone: 'Phone',
  date_of_birth: 'Date of Birth',
  is_oic: 'Officer In Charge (OIC)',
  start_date: 'Start Date',
  first_sunday: '1st Sunday Schedule',
  second_sunday: '2nd Sunday Schedule',
  third_sunday: '3rd Sunday Schedule',
  fourth_sunday: '4th Sunday Schedule',
  fifth_sunday: '5th Sunday Schedule',
};

export function formatMemberFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) {
    return FIELD_LABELS[key];
  }
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

// Converts YYYY-MM-DD, M/D/YY, M/D/YYYY, or ISO timestamps to YYYY-MM-DD; returns null if empty or unrecognized.
export function normalizeStartDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const mdyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(trimmed);
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1], 10);
    const day = parseInt(mdyMatch[2], 10);
    let year = parseInt(mdyMatch[3], 10);
    if (mdyMatch[3].length === 2) {
      year = year <= 50 ? 2000 + year : 1900 + year;
    }
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const timestamp = Date.parse(trimmed);
  if (!Number.isNaN(timestamp)) {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

// Converts M/D/YY or M/D/YYYY to YYYY-MM-DD; returns input unchanged if already ISO or unrecognized.
function normalizeDateOfBirth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed);
  if (!match) return trimmed;

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  if (match[3].length === 2) {
    year = year <= 25 ? 2000 + year : 1900 + year;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
  if (key === 'role') return 'role';
  if (key === 'category') return 'category';

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
  const normalizedHeaders = headers.map((header) =>
    canonicalizeMetadataHeaderKey(normalizeMetadataHeaderKey(header)),
  );
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
      role: '',
      category: '',
      metadata: {},
    };

    for (const [header, rawValue] of Object.entries(csvRow)) {
      const coreField = resolveCoreField(header);
      const normalized = normalizeText(rawValue);

      if (coreField) {
        if (coreField === 'email' || coreField === 'phone') {
          prepared[coreField] = normalized.length > 0 ? normalized : null;
        } else if (coreField === 'date_of_birth') {
          const iso = normalizeDateOfBirth(normalized);
          prepared.date_of_birth = iso.length > 0 ? iso : null;
        } else {
          prepared[coreField] = normalized;
        }
        continue;
      }

      if (normalizeLookupHeaderKey(header) === 'lastactivity') {
        continue;
      }

      const metadataKey = canonicalizeMetadataHeaderKey(normalizeMetadataHeaderKey(header));
      if (!metadataKey || CORE_FIELDS.has(metadataKey)) {
        continue;
      }

      if (metadataKey === 'start_date') {
        const normalizedDate = normalizeStartDate(rawValue);
        if (normalizedDate !== null) {
          prepared.metadata.start_date = normalizedDate;
        }
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
    if (!prepared.role) {
      errors.push(`Row ${rowNumber}: Role is required.`);
    }
    if (!prepared.category) {
      errors.push(`Row ${rowNumber}: Category is required.`);
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

    const fieldChanges: MemberCsvFieldChange[] = [];
    const newMemberDetails: MemberCsvNewDetail[] = [];

    const matchedMember = memberIdMatch ?? (tripletMatches.length === 1 ? tripletMatches[0] : null);

    if (operation === 'update' || operation === 'update_member_id') {
      if (matchedMember) {
        if (matchedMember.member_id !== row.member_id) {
          fieldChanges.push({
            field: 'member_id',
            label: formatMemberFieldLabel('member_id'),
            old_value: matchedMember.member_id || null,
            new_value: row.member_id,
          });
        }
        if (matchedMember.first_name.trim() !== row.first_name.trim()) {
          fieldChanges.push({
            field: 'first_name',
            label: formatMemberFieldLabel('first_name'),
            old_value: matchedMember.first_name || null,
            new_value: row.first_name,
          });
        }
        if (matchedMember.last_name.trim() !== row.last_name.trim()) {
          fieldChanges.push({
            field: 'last_name',
            label: formatMemberFieldLabel('last_name'),
            old_value: matchedMember.last_name || null,
            new_value: row.last_name,
          });
        }
        if (matchedMember.nickname.trim() !== row.nickname.trim()) {
          fieldChanges.push({
            field: 'nickname',
            label: formatMemberFieldLabel('nickname'),
            old_value: matchedMember.nickname || null,
            new_value: row.nickname,
          });
        }
        if ((matchedMember.role ?? '').trim() !== row.role.trim()) {
          fieldChanges.push({
            field: 'role',
            label: formatMemberFieldLabel('role'),
            old_value: matchedMember.role || null,
            new_value: row.role,
          });
        }
        if ((matchedMember.category ?? '').trim() !== row.category.trim()) {
          fieldChanges.push({
            field: 'category',
            label: formatMemberFieldLabel('category'),
            old_value: matchedMember.category || null,
            new_value: row.category,
          });
        }
        if (row.email !== null) {
          const oldEmail = (matchedMember.email ?? '').trim().toLowerCase();
          const newEmail = row.email.trim().toLowerCase();
          if (oldEmail !== newEmail) {
            fieldChanges.push({
              field: 'email',
              label: formatMemberFieldLabel('email'),
              old_value: matchedMember.email || null,
              new_value: row.email,
            });
          }
        }
        if (row.phone !== null) {
          const oldPhone = (matchedMember.phone ?? '').trim();
          const newPhone = row.phone.trim();
          if (oldPhone !== newPhone) {
            fieldChanges.push({
              field: 'phone',
              label: formatMemberFieldLabel('phone'),
              old_value: matchedMember.phone || null,
              new_value: row.phone,
            });
          }
        }
        if (row.date_of_birth !== null) {
          const oldDob = (matchedMember.date_of_birth ?? '').trim();
          const newDob = row.date_of_birth.trim();
          if (oldDob !== newDob) {
            fieldChanges.push({
              field: 'date_of_birth',
              label: formatMemberFieldLabel('date_of_birth'),
              old_value: matchedMember.date_of_birth || null,
              new_value: row.date_of_birth,
            });
          }
        }

        const existingMeta = (matchedMember.metadata ?? {}) as Record<string, unknown>;
        for (const [key, rawNewVal] of Object.entries(row.metadata)) {
          const rawOldVal = existingMeta[key];
          const oldStr =
            rawOldVal !== undefined && rawOldVal !== null ? String(rawOldVal).trim() : null;
          const newStr =
            rawNewVal !== undefined && rawNewVal !== null ? String(rawNewVal).trim() : null;
          if (oldStr !== newStr) {
            fieldChanges.push({
              field: key,
              label: formatMemberFieldLabel(key),
              old_value: oldStr,
              new_value: newStr,
            });
          }
        }
      }
    } else if (operation === 'insert') {
      newMemberDetails.push({
        field: 'member_id',
        label: formatMemberFieldLabel('member_id'),
        value: row.member_id,
      });
      newMemberDetails.push({
        field: 'first_name',
        label: formatMemberFieldLabel('first_name'),
        value: row.first_name,
      });
      newMemberDetails.push({
        field: 'last_name',
        label: formatMemberFieldLabel('last_name'),
        value: row.last_name,
      });
      newMemberDetails.push({
        field: 'nickname',
        label: formatMemberFieldLabel('nickname'),
        value: row.nickname,
      });
      newMemberDetails.push({
        field: 'role',
        label: formatMemberFieldLabel('role'),
        value: row.role,
      });
      newMemberDetails.push({
        field: 'category',
        label: formatMemberFieldLabel('category'),
        value: row.category,
      });
      if (row.email) {
        newMemberDetails.push({
          field: 'email',
          label: formatMemberFieldLabel('email'),
          value: row.email,
        });
      }
      if (row.phone) {
        newMemberDetails.push({
          field: 'phone',
          label: formatMemberFieldLabel('phone'),
          value: row.phone,
        });
      }
      if (row.date_of_birth) {
        newMemberDetails.push({
          field: 'date_of_birth',
          label: formatMemberFieldLabel('date_of_birth'),
          value: row.date_of_birth,
        });
      }
      for (const [key, value] of Object.entries(row.metadata)) {
        if (value !== undefined && value !== null && String(value).trim().length > 0) {
          newMemberDetails.push({
            field: key,
            label: formatMemberFieldLabel(key),
            value: String(value),
          });
        }
      }
    }

    previewRows.push({
      row_number: row.row_number,
      member_id: row.member_id,
      first_name: row.first_name,
      last_name: row.last_name,
      nickname: row.nickname,
      role: row.role,
      category: row.category,
      operation,
      target_user_id: targetUserId,
      target_member_id: targetMemberId,
      errors: rowErrors,
      field_changes: fieldChanges,
      new_member_details: newMemberDetails,
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
