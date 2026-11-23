export interface ExistingMember {
  id: string;
  member_id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  role?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ParsedSheetMemberRow {
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
  clear_metadata_keys: string[];
}

export interface ResolvedSheetUpsertRow {
  operation: 'insert' | 'update';
  target_id?: string;
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
  clear_metadata_keys: string[];
}

export interface SkippedSyncRow {
  row_number: number;
  member_id: string;
  reasons: string[];
}

const MEMBER_ID_ALIASES = new Set(['rfid', 'memberid', 'member_id']);
const FIRST_NAME_ALIASES = new Set(['firstname', 'first_name', 'first']);
const LAST_NAME_ALIASES = new Set(['surname', 'lastname', 'last_name', 'last']);
const NICKNAME_ALIASES = new Set(['nickname', 'nick_name', 'nick']);
const EMAIL_ALIASES = new Set(['email', 'email_address', 'emailaddress']);
const PHONE_ALIASES = new Set([
  'phone',
  'phone_number',
  'phonenumber',
  'mobile',
  'contact_number',
  'contactnumber',
]);
const DATE_OF_BIRTH_ALIASES = new Set(['dateofbirth', 'date_of_birth', 'dob', 'birthdate']);

const IGNORED_HEADERS = new Set(['timestamp', 'powerappsid', 'lastactivity']);

const CORE_FIELDS = new Set([
  'member_id',
  'first_name',
  'last_name',
  'nickname',
  'email',
  'phone',
  'date_of_birth',
  'role',
  'category',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_YYYY_MM_DD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type CoreField =
  | 'member_id'
  | 'first_name'
  | 'last_name'
  | 'nickname'
  | 'email'
  | 'phone'
  | 'date_of_birth'
  | 'role'
  | 'category';

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
    case 'volunteer_id':
    case 'volunteerid':
      return 'volunteerid';
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

function resolveCoreField(header: string): CoreField | null {
  const key = normalizeLookupHeaderKey(header);

  if (MEMBER_ID_ALIASES.has(key)) return 'member_id';
  if (FIRST_NAME_ALIASES.has(key)) return 'first_name';
  if (LAST_NAME_ALIASES.has(key)) return 'last_name';
  if (NICKNAME_ALIASES.has(key)) return 'nickname';
  if (EMAIL_ALIASES.has(key)) return 'email';
  if (PHONE_ALIASES.has(key)) return 'phone';
  if (DATE_OF_BIRTH_ALIASES.has(key)) return 'date_of_birth';
  if (key === 'role') return 'role';
  if (key === 'category') return 'category';

  return null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = normalizeText(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTriplet(
  firstName: string | null,
  lastName: string | null,
  nickname: string | null,
): string {
  return [firstName, lastName, nickname]
    .map((value) => normalizeText(value).toLowerCase())
    .join('|');
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

function normalizeStartDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const mdyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(trimmed);
  if (mdyMatch) {
    const month = Number.parseInt(mdyMatch[1], 10);
    const day = Number.parseInt(mdyMatch[2], 10);
    let year = Number.parseInt(mdyMatch[3], 10);
    if (mdyMatch[3].length === 2) {
      year = year <= 50 ? 2000 + year : 1900 + year;
    }
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

function normalizeDateOfBirth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (DATE_YYYY_MM_DD_PATTERN.test(trimmed)) return trimmed;

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed);
  if (!match) return trimmed;

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  let year = Number.parseInt(match[3], 10);
  if (match[3].length === 2) {
    year = year <= 25 ? 2000 + year : 1900 + year;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseSheetRows(values: string[][]): {
  parsedRows: ParsedSheetMemberRow[];
  skipped: SkippedSyncRow[];
  totalDataRows: number;
} {
  if (values.length < 2) {
    return { parsedRows: [], skipped: [], totalDataRows: 0 };
  }

  const headers = values[0].map((header) => normalizeText(header));
  const parsedRows: ParsedSheetMemberRow[] = [];
  const skipped: SkippedSyncRow[] = [];
  let totalDataRows = 0;

  for (let index = 1; index < values.length; index += 1) {
    const cells = values[index] ?? [];
    const hasAnyValue = cells.some((cell) => normalizeText(cell).length > 0);
    if (!hasAnyValue) {
      continue;
    }

    totalDataRows += 1;
    const rowNumber = index + 1;

    const prepared: ParsedSheetMemberRow = {
      row_number: rowNumber,
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
      clear_metadata_keys: [],
    };

    const clearKeySet = new Set<string>();

    for (let colIndex = 0; colIndex < headers.length; colIndex += 1) {
      const header = headers[colIndex];
      if (!header) continue;

      const lookupKey = normalizeLookupHeaderKey(header);
      if (!lookupKey || IGNORED_HEADERS.has(lookupKey)) {
        continue;
      }

      const rawValue = cells[colIndex] ?? '';
      const normalized = normalizeText(rawValue);
      const coreField = resolveCoreField(header);

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

      const metadataKey = canonicalizeMetadataHeaderKey(normalizeMetadataHeaderKey(header));
      if (!metadataKey || CORE_FIELDS.has(metadataKey)) {
        continue;
      }

      if (metadataKey === 'start_date') {
        const normalizedDate = normalizeStartDate(rawValue);
        if (normalizedDate !== null) {
          prepared.metadata.start_date = normalizedDate;
          clearKeySet.delete('start_date');
        } else if (normalized.length === 0) {
          clearKeySet.add('start_date');
        }
        continue;
      }

      const metadataValue = toMetadataValue(rawValue);
      if (metadataValue !== null) {
        prepared.metadata[metadataKey] = metadataValue;
        clearKeySet.delete(metadataKey);
      } else {
        clearKeySet.add(metadataKey);
      }
    }

    prepared.clear_metadata_keys = Array.from(clearKeySet);

    const reasons: string[] = [];
    if (!prepared.member_id) reasons.push('RFID/Member ID is required.');
    if (!prepared.first_name) reasons.push('Firstname is required.');
    if (!prepared.last_name) reasons.push('Surname is required.');
    if (!prepared.nickname) reasons.push('Nickname is required.');
    if (!prepared.role) reasons.push('Role is required.');
    if (!prepared.category) reasons.push('Category is required.');
    if (prepared.member_id.length > 100) reasons.push('RFID/Member ID exceeds 100 characters.');
    if (prepared.email && !EMAIL_PATTERN.test(prepared.email)) {
      reasons.push('Email is invalid.');
    }
    if (prepared.date_of_birth && !DATE_YYYY_MM_DD_PATTERN.test(prepared.date_of_birth)) {
      reasons.push('Date of birth must use YYYY-MM-DD format.');
    }

    if (reasons.length > 0) {
      skipped.push({
        row_number: rowNumber,
        member_id: prepared.member_id,
        reasons,
      });
      continue;
    }

    parsedRows.push(prepared);
  }

  return { parsedRows, skipped, totalDataRows };
}

export function resolveSyncRows(
  rows: ParsedSheetMemberRow[],
  existingMembers: ExistingMember[],
): {
  resolvedRows: ResolvedSheetUpsertRow[];
  skipped: SkippedSyncRow[];
} {
  const skipped: SkippedSyncRow[] = [];
  const resolvedRows: ResolvedSheetUpsertRow[] = [];

  const memberIdMap = new Map(
    existingMembers.map((member) => [normalizeText(member.member_id), member]),
  );
  const emailMap = new Map<string, string>();
  const tripletMap = new Map<string, ExistingMember[]>();

  for (const member of existingMembers) {
    const key = normalizeTriplet(member.first_name, member.last_name, member.nickname);
    const list = tripletMap.get(key) ?? [];
    list.push(member);
    tripletMap.set(key, list);

    const email = normalizeEmail(member.email);
    if (email) {
      emailMap.set(email, member.id);
    }
  }

  const memberIdCounts = new Map<string, number>();
  const tripletCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();

  for (const row of rows) {
    memberIdCounts.set(row.member_id, (memberIdCounts.get(row.member_id) ?? 0) + 1);
    const key = normalizeTriplet(row.first_name, row.last_name, row.nickname);
    tripletCounts.set(key, (tripletCounts.get(key) ?? 0) + 1);

    const email = normalizeEmail(row.email);
    if (email) {
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    }
  }

  const targetedIds = new Set<string>();

  for (const row of rows) {
    const rowErrors: string[] = [];

    if ((memberIdCounts.get(row.member_id) ?? 0) > 1) {
      rowErrors.push('Member ID appears multiple times in this sheet.');
    }

    const tripletKey = normalizeTriplet(row.first_name, row.last_name, row.nickname);
    if ((tripletCounts.get(tripletKey) ?? 0) > 1) {
      rowErrors.push('Firstname + Surname + Nickname appears multiple times in this sheet.');
    }

    const normalizedEmail = normalizeEmail(row.email);
    if (normalizedEmail && (emailCounts.get(normalizedEmail) ?? 0) > 1) {
      rowErrors.push('Email appears multiple times in this sheet.');
    }

    const memberIdMatch = memberIdMap.get(row.member_id) ?? null;
    const tripletMatches = tripletMap.get(tripletKey) ?? [];

    if (tripletMatches.length > 1) {
      rowErrors.push('Multiple existing members match this name triplet.');
    }

    if (memberIdMatch && tripletMatches.length === 1 && tripletMatches[0].id !== memberIdMatch.id) {
      rowErrors.push(
        'RFID matches one member while Firstname+Surname+Nickname matches a different member.',
      );
    }

    let resolved: ResolvedSheetUpsertRow | null = null;

    if (rowErrors.length === 0) {
      if (memberIdMatch) {
        resolved = {
          operation: 'update',
          target_id: memberIdMatch.id,
          member_id: row.member_id,
          first_name: row.first_name,
          last_name: row.last_name,
          nickname: row.nickname,
          email: row.email,
          phone: row.phone,
          date_of_birth: row.date_of_birth,
          role: row.role,
          category: row.category,
          metadata: row.metadata,
          clear_metadata_keys: row.clear_metadata_keys,
        };
      } else if (tripletMatches.length === 1) {
        resolved = {
          operation: 'update',
          target_id: tripletMatches[0].id,
          member_id: row.member_id,
          first_name: row.first_name,
          last_name: row.last_name,
          nickname: row.nickname,
          email: row.email,
          phone: row.phone,
          date_of_birth: row.date_of_birth,
          role: row.role,
          category: row.category,
          metadata: row.metadata,
          clear_metadata_keys: row.clear_metadata_keys,
        };
      } else {
        resolved = {
          operation: 'insert',
          member_id: row.member_id,
          first_name: row.first_name,
          last_name: row.last_name,
          nickname: row.nickname,
          email: row.email,
          phone: row.phone,
          date_of_birth: row.date_of_birth,
          role: row.role,
          category: row.category,
          metadata: row.metadata,
          clear_metadata_keys: [],
        };
      }
    }

    if (resolved?.target_id) {
      if (targetedIds.has(resolved.target_id)) {
        rowErrors.push('Another row already targets this same member.');
      } else {
        targetedIds.add(resolved.target_id);
      }
    }

    if (resolved && normalizedEmail) {
      const emailOwnerId = emailMap.get(normalizedEmail) ?? null;
      if (emailOwnerId && emailOwnerId !== resolved.target_id) {
        rowErrors.push('Email already belongs to another member record.');
      }
    }

    if (rowErrors.length > 0) {
      skipped.push({
        row_number: row.row_number,
        member_id: row.member_id,
        reasons: rowErrors,
      });
      continue;
    }

    if (resolved) {
      resolvedRows.push(resolved);
    }
  }

  return { resolvedRows, skipped };
}

export type SyncPreviewOperation = 'insert' | 'update' | 'update_member_id' | 'error';

export interface SyncPreviewFieldChange {
  field: string;
  label: string;
  old_value: string | null;
  new_value: string | null;
}

export interface SyncPreviewNewDetail {
  field: string;
  label: string;
  value: string;
}

export interface SyncPreviewRow {
  row_number: number;
  member_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  role: string;
  category: string;
  operation: SyncPreviewOperation;
  target_user_id?: string;
  target_member_id?: string;
  errors: string[];
  field_changes: SyncPreviewFieldChange[];
  new_member_details: SyncPreviewNewDetail[];
}

export interface SyncPreviewSummary {
  total_rows: number;
  insert_count: number;
  update_count: number;
  update_member_id_count: number;
  unchanged_count: number;
  error_count: number;
}

export interface SyncPreviewBuildResult {
  rows: SyncPreviewRow[];
  summary: SyncPreviewSummary;
}

const PREVIEW_FIELD_LABELS: Record<string, string> = {
  member_id: 'RFID / Member ID',
  first_name: 'First Name',
  last_name: 'Last Name',
  nickname: 'Nickname',
  email: 'Email',
  phone: 'Phone',
  date_of_birth: 'Date of Birth',
  role: 'Role',
  category: 'Category',
  first_sunday: '1st Sunday',
  second_sunday: '2nd Sunday',
  third_sunday: '3rd Sunday',
  fourth_sunday: '4th Sunday',
  fifth_sunday: '5th Sunday',
  is_oic: 'Is OIC',
  sr_pwd: 'SR/PWD',
  volunteerid: 'Volunteer ID',
  start_date: 'Start Date',
};

function formatPreviewFieldLabel(key: string): string {
  if (PREVIEW_FIELD_LABELS[key]) {
    return PREVIEW_FIELD_LABELS[key];
  }
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatComparableValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function buildSyncPreview(params: {
  parsedRows: ParsedSheetMemberRow[];
  parseSkipped: SkippedSyncRow[];
  existingMembers: ExistingMember[];
  resolvedRows: ResolvedSheetUpsertRow[];
  resolveSkipped: SkippedSyncRow[];
}): SyncPreviewBuildResult {
  const { parsedRows, parseSkipped, existingMembers, resolvedRows, resolveSkipped } = params;

  const existingById = new Map(existingMembers.map((member) => [member.id, member]));
  const parsedByMemberId = new Map<string, ParsedSheetMemberRow>();
  for (const row of parsedRows) {
    if (!parsedByMemberId.has(row.member_id)) {
      parsedByMemberId.set(row.member_id, row);
    }
  }
  const parsedByRowNumber = new Map(parsedRows.map((row) => [row.row_number, row]));

  const previewRows: SyncPreviewRow[] = [];

  for (const resolved of resolvedRows) {
    const parsedRow = parsedByMemberId.get(resolved.member_id);
    const rowNumber = parsedRow?.row_number ?? 0;

    if (resolved.operation === 'insert') {
      const newMemberDetails: SyncPreviewNewDetail[] = [
        {
          field: 'member_id',
          label: formatPreviewFieldLabel('member_id'),
          value: resolved.member_id,
        },
        {
          field: 'first_name',
          label: formatPreviewFieldLabel('first_name'),
          value: resolved.first_name,
        },
        {
          field: 'last_name',
          label: formatPreviewFieldLabel('last_name'),
          value: resolved.last_name,
        },
        { field: 'nickname', label: formatPreviewFieldLabel('nickname'), value: resolved.nickname },
        { field: 'role', label: formatPreviewFieldLabel('role'), value: resolved.role },
        { field: 'category', label: formatPreviewFieldLabel('category'), value: resolved.category },
      ];

      if (resolved.email) {
        newMemberDetails.push({
          field: 'email',
          label: formatPreviewFieldLabel('email'),
          value: resolved.email,
        });
      }
      if (resolved.phone) {
        newMemberDetails.push({
          field: 'phone',
          label: formatPreviewFieldLabel('phone'),
          value: resolved.phone,
        });
      }
      if (resolved.date_of_birth) {
        newMemberDetails.push({
          field: 'date_of_birth',
          label: formatPreviewFieldLabel('date_of_birth'),
          value: resolved.date_of_birth,
        });
      }

      for (const [key, val] of Object.entries(resolved.metadata)) {
        const formatted = formatComparableValue(val);
        if (formatted !== null) {
          newMemberDetails.push({
            field: key,
            label: formatPreviewFieldLabel(key),
            value: formatted,
          });
        }
      }

      previewRows.push({
        row_number: rowNumber,
        member_id: resolved.member_id,
        first_name: resolved.first_name,
        last_name: resolved.last_name,
        nickname: resolved.nickname,
        role: resolved.role,
        category: resolved.category,
        operation: 'insert',
        errors: [],
        field_changes: [],
        new_member_details: newMemberDetails,
      });
      continue;
    }

    const existing = resolved.target_id ? existingById.get(resolved.target_id) : undefined;
    const isMemberIdChange = Boolean(
      existing && normalizeText(existing.member_id) !== normalizeText(resolved.member_id),
    );
    const operation: SyncPreviewOperation = isMemberIdChange ? 'update_member_id' : 'update';
    const fieldChanges: SyncPreviewFieldChange[] = [];

    if (existing) {
      const compareCore = (
        field: string,
        oldRaw: string | null | undefined,
        newRaw: string | null | undefined,
        options: { ignoreIfNewNull?: boolean; caseInsensitive?: boolean } = {},
      ) => {
        if (options.ignoreIfNewNull && (newRaw === null || newRaw === undefined)) {
          return;
        }
        const oldVal = formatComparableValue(oldRaw);
        const newVal = formatComparableValue(newRaw);
        const oldCmp = options.caseInsensitive ? (oldVal?.toLowerCase() ?? null) : oldVal;
        const newCmp = options.caseInsensitive ? (newVal?.toLowerCase() ?? null) : newVal;
        if (oldCmp !== newCmp) {
          fieldChanges.push({
            field,
            label: formatPreviewFieldLabel(field),
            old_value: oldVal,
            new_value: newVal,
          });
        }
      };

      compareCore('member_id', existing.member_id, resolved.member_id);
      compareCore('first_name', existing.first_name, resolved.first_name);
      compareCore('last_name', existing.last_name, resolved.last_name);
      compareCore('nickname', existing.nickname, resolved.nickname);
      compareCore('role', existing.role, resolved.role);
      compareCore('category', existing.category, resolved.category);
      compareCore('email', existing.email, resolved.email, {
        ignoreIfNewNull: true,
        caseInsensitive: true,
      });
      compareCore('phone', existing.phone, resolved.phone, { ignoreIfNewNull: true });
      compareCore('date_of_birth', existing.date_of_birth, resolved.date_of_birth, {
        ignoreIfNewNull: true,
      });

      const existingMeta =
        existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {};

      for (const [key, nextRaw] of Object.entries(resolved.metadata)) {
        const oldVal = formatComparableValue(existingMeta[key]);
        const newVal = formatComparableValue(nextRaw);
        if (oldVal !== newVal) {
          fieldChanges.push({
            field: key,
            label: formatPreviewFieldLabel(key),
            old_value: oldVal,
            new_value: newVal,
          });
        }
      }

      for (const clearedKey of resolved.clear_metadata_keys) {
        if (clearedKey in resolved.metadata) continue;
        const oldVal = formatComparableValue(existingMeta[clearedKey]);
        if (oldVal !== null) {
          fieldChanges.push({
            field: clearedKey,
            label: formatPreviewFieldLabel(clearedKey),
            old_value: oldVal,
            new_value: null,
          });
        }
      }
    }

    previewRows.push({
      row_number: rowNumber,
      member_id: resolved.member_id,
      first_name: resolved.first_name,
      last_name: resolved.last_name,
      nickname: resolved.nickname,
      role: resolved.role,
      category: resolved.category,
      operation,
      target_user_id: existing?.id ?? resolved.target_id,
      target_member_id: existing?.member_id,
      errors: [],
      field_changes: fieldChanges,
      new_member_details: [],
    });
  }

  for (const skippedEntry of [...parseSkipped, ...resolveSkipped]) {
    const parsed = parsedByRowNumber.get(skippedEntry.row_number);
    previewRows.push({
      row_number: skippedEntry.row_number,
      member_id: skippedEntry.member_id || parsed?.member_id || '',
      first_name: parsed?.first_name ?? '',
      last_name: parsed?.last_name ?? '',
      nickname: parsed?.nickname ?? '',
      role: parsed?.role ?? '',
      category: parsed?.category ?? '',
      operation: 'error',
      errors: skippedEntry.reasons,
      field_changes: [],
      new_member_details: [],
    });
  }

  previewRows.sort((a, b) => a.row_number - b.row_number);

  let insertCount = 0;
  let updateCount = 0;
  let updateMemberIdCount = 0;
  let unchangedCount = 0;
  let errorCount = 0;

  for (const row of previewRows) {
    if (row.operation === 'insert') {
      insertCount += 1;
    } else if (row.operation === 'update_member_id') {
      updateMemberIdCount += 1;
    } else if (row.operation === 'update') {
      if (row.field_changes.length === 0) {
        unchangedCount += 1;
      } else {
        updateCount += 1;
      }
    } else if (row.operation === 'error') {
      errorCount += 1;
    }
  }

  return {
    rows: previewRows,
    summary: {
      total_rows: previewRows.length,
      insert_count: insertCount,
      update_count: updateCount,
      update_member_id_count: updateMemberIdCount,
      unchanged_count: unchangedCount,
      error_count: errorCount,
    },
  };
}
