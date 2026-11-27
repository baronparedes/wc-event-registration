import { MEMBER_EXTRA_METADATA_KEYS } from './constants';

export const CIVIL_STATUS_METADATA_KEYS = {
  civilStatus: MEMBER_EXTRA_METADATA_KEYS.civilStatus,
  weddingAnniversaryDate: MEMBER_EXTRA_METADATA_KEYS.weddingAnniversaryDate,
} as const;

export type CivilStatusMetadataKeyType = keyof typeof CIVIL_STATUS_METADATA_KEYS;

export const CIVIL_STATUS_CANDIDATE_KEYS = {
  civilStatus: ['civil_status', 'civilstatus', 'Civil Status'],
  weddingAnniversaryDate: [
    'wedanniv_date',
    'wedannivdate',
    'wedding_anniversary_date',
    'wedding_anniversary',
    'Wedding Anniversary',
    'Wedding Anniversary Date',
  ],
} as const;

export const CIVIL_STATUS_VALUES = [
  'Single',
  'Married',
  'Widowed',
  'Separated',
  'Solo Parent',
] as const;

export type CivilStatusOption = '' | (typeof CIVIL_STATUS_VALUES)[number];

export const CIVIL_STATUS_OPTIONS = CIVIL_STATUS_VALUES.map((value) => ({
  value,
  label: value,
}));

export type CivilStatusValues = {
  civilStatus: CivilStatusOption;
  weddingAnniversaryDate: string;
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '');
}

const ALL_CANDIDATE_NORMALIZED_KEYS = new Set(
  Object.values(CIVIL_STATUS_CANDIDATE_KEYS)
    .flat()
    .map((k) => normalizeKey(k)),
);

/** Determines if a metadata key belongs to the civil status / wedding anniversary domain. */
export function isCivilStatusKey(key: string): boolean {
  return ALL_CANDIDATE_NORMALIZED_KEYS.has(normalizeKey(key));
}

/** Detects and normalizes civil status values case-insensitively to a canonical option. */
export function detectCivilStatus(raw: string | undefined | null): CivilStatusOption {
  if (!raw) return '';
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return '';

  const matched = CIVIL_STATUS_VALUES.find((option) => option.toLowerCase() === normalized);
  return matched ?? '';
}

/** Converts YYYY-MM-DD, M/D/YY, or M/D/YYYY strings to YYYY-MM-DD for date inputs. */
export function normalizeWeddingAnniversaryDate(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  }

  const mdyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed);
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1], 10);
    const day = parseInt(mdyMatch[2], 10);
    let year = parseInt(mdyMatch[3], 10);
    if (mdyMatch[3].length === 2) {
      year = year <= 50 ? 2000 + year : 1900 + year;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '';
}

function findValueInRecord(
  record: Record<string, string | undefined | null>,
  candidates: readonly string[],
): string | undefined {
  for (const candidate of candidates) {
    const val = record[candidate];
    if (val !== undefined && val !== null && val.trim() !== '') {
      return val.trim();
    }
  }

  const normalizedCandidates = candidates.map(normalizeKey);
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined && value !== null && value.trim() !== '') {
      if (normalizedCandidates.includes(normalizeKey(key))) {
        return value.trim();
      }
    }
  }
  return undefined;
}

function convertEntriesToRecord(entries: { key: string; value: string }[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.key) {
      record[entry.key] = entry.value;
    }
  }
  return record;
}

/** Extracts civil status and wedding anniversary date from a metadata record or metadata_entries array. */
export function extractCivilStatusValues(
  metadata:
    | Record<string, string | undefined | null>
    | { key: string; value: string }[]
    | null
    | undefined,
): CivilStatusValues {
  if (!metadata) {
    return {
      civilStatus: '',
      weddingAnniversaryDate: '',
    };
  }

  const record: Record<string, string | undefined | null> = Array.isArray(metadata)
    ? convertEntriesToRecord(metadata)
    : metadata;

  const rawCivilStatus = findValueInRecord(record, CIVIL_STATUS_CANDIDATE_KEYS.civilStatus);
  const rawWeddingAnniversary = findValueInRecord(
    record,
    CIVIL_STATUS_CANDIDATE_KEYS.weddingAnniversaryDate,
  );

  return {
    civilStatus: detectCivilStatus(rawCivilStatus),
    weddingAnniversaryDate: normalizeWeddingAnniversaryDate(rawWeddingAnniversary),
  };
}

/** Updates or removes a civil status / wedding anniversary key in a metadata_entries array. */
export function updateMetadataWithCivilStatusField(
  entries: { key: string; value: string }[],
  fieldKey: CivilStatusMetadataKeyType,
  newValue: string,
): { key: string; value: string }[] {
  const canonicalKey = CIVIL_STATUS_METADATA_KEYS[fieldKey];
  const candidateKeys = CIVIL_STATUS_CANDIDATE_KEYS[fieldKey];
  const candidateNormalized = candidateKeys.map(normalizeKey);

  const nextEntries = entries.filter((e) => !candidateNormalized.includes(normalizeKey(e.key)));
  const existingIndex = entries.findIndex((e) => candidateNormalized.includes(normalizeKey(e.key)));

  const trimmed = newValue.trim();

  if (trimmed === '') {
    return nextEntries;
  }

  if (existingIndex !== -1) {
    const insertAt = Math.min(existingIndex, nextEntries.length);
    nextEntries.splice(insertAt, 0, { key: canonicalKey, value: trimmed });
  } else {
    nextEntries.push({ key: canonicalKey, value: trimmed });
  }

  return nextEntries;
}
