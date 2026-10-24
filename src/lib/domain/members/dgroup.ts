const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const DGROUP_METADATA_KEYS = {
  status: 'dgroup_status',
  memberSince: 'dgroup_member_since',
  leader: 'dgroup_leader',
  leaderContact: 'dgroup_leader_contact',
  leaderEmail: 'dgroup_leader_email',
  minerOpenSchedule: 'dgroup_miner_open_schedule',
  minerOpenSlots: 'dgroup_miner_open_slots',
} as const;

export type DGroupMetadataKeyType = keyof typeof DGROUP_METADATA_KEYS;

export const DGROUP_CANDIDATE_KEYS = {
  status: ['dgroup_status', 'dgroupstatus', 'd_group_status', 'DGroup Status'],
  memberSince: [
    'dgroup_member_since',
    'dgroupmember since',
    'dgroupmembersince',
    'd_group_member_since',
    'DGroup Member Since',
  ],
  leader: ['dgroup_leader', 'dgroupleader', 'd_group_leader', 'DGroup Leader'],
  leaderContact: [
    'dgroup_leader_contact',
    'dgroup_contact',
    'dgroupleadercontact',
    'd_group_leader_contact',
    'DGroup Leader Contact',
  ],
  leaderEmail: [
    'dgroup_leader_email',
    'dgroupleaderemail',
    'd_group_leader_email',
    'DGroup Leader Email',
  ],
  minerOpenSchedule: [
    'dgroup_miner_open_schedule',
    'dgroupmineropenschedule',
    'd_group_miner_open_schedule',
    'DGroup Miner Open Schedule',
  ],
  minerOpenSlots: [
    'dgroup_miner_open_slots',
    'dgroupmineropenslots',
    'd_group_miner_open_slots',
    'DGroup Miner Open Slots',
  ],
} as const;

export type DGroupStatusOption = '' | 'member' | 'leader';

export type DGroupValues = {
  status: DGroupStatusOption;
  memberSince: string;
  leader: string;
  leaderContact: string;
  leaderEmail: string;
  minerOpenSchedule: string;
  minerOpenSlots: string;
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '');
}

const ALL_CANDIDATE_NORMALIZED_KEYS = new Set(
  Object.values(DGROUP_CANDIDATE_KEYS)
    .flat()
    .map((k) => normalizeKey(k)),
);

/** Determines if a metadata key belongs to the DGroup domain. */
export function isDGroupKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (normalized.startsWith('dgroup') || normalized.startsWith('d_group')) {
    return true;
  }
  return ALL_CANDIDATE_NORMALIZED_KEYS.has(normalized);
}

/** Formats a raw date or string into Mmm-YY format (e.g., Oct-23). Falls back to original string. */
export function formatDGroupMemberSince(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Check for ISO formats like YYYY-MM or YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (month >= 1 && month <= 12) {
      const monthStr = MONTH_NAMES[month - 1];
      const shortYear = String(year).slice(-2);
      return `${monthStr}-${shortYear}`;
    }
  }

  // Check for existing formats like Oct-23, Oct 23, Oct-2023, October 2023, etc.
  const mmmYyMatch = trimmed.match(/^([A-Za-z]{3,9})[-/\s]?(\d{2,4})$/);
  if (mmmYyMatch) {
    const monthPrefix = mmmYyMatch[1].slice(0, 3).toUpperCase();
    const matchedMonth = MONTH_NAMES.find((m) => m.toUpperCase() === monthPrefix);
    if (matchedMonth) {
      const yearStr = mmmYyMatch[2].length === 4 ? mmmYyMatch[2].slice(-2) : mmmYyMatch[2];
      return `${matchedMonth}-${yearStr}`;
    }
  }

  return trimmed;
}

/** Detects and normalizes DGroup status to 'member', 'leader', or '' (blank). */
export function detectDGroupStatus(raw: string | undefined | null): DGroupStatusOption {
  if (!raw) return '';
  const normalized = raw.trim().toLowerCase();
  if (['member', 'dgroup member'].includes(normalized)) {
    return 'member';
  }
  if (['leader', 'dgroup leader', 'head', 'co-leader'].includes(normalized)) {
    return 'leader';
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

/** Extracts all 7 DGroup fields from a metadata record or metadata_entries array. */
export function extractDGroupValues(
  metadata:
    | Record<string, string | undefined | null>
    | { key: string; value: string }[]
    | null
    | undefined,
): DGroupValues {
  if (!metadata) {
    return {
      status: '',
      memberSince: '',
      leader: '',
      leaderContact: '',
      leaderEmail: '',
      minerOpenSchedule: '',
      minerOpenSlots: '',
    };
  }

  const record: Record<string, string | undefined | null> = Array.isArray(metadata)
    ? convertEntriesToRecord(metadata)
    : metadata;

  const rawStatus = findValueInRecord(record, DGROUP_CANDIDATE_KEYS.status);
  const rawMemberSince = findValueInRecord(record, DGROUP_CANDIDATE_KEYS.memberSince);
  const leader = findValueInRecord(record, DGROUP_CANDIDATE_KEYS.leader) ?? '';
  const leaderContact = findValueInRecord(record, DGROUP_CANDIDATE_KEYS.leaderContact) ?? '';
  const leaderEmail = findValueInRecord(record, DGROUP_CANDIDATE_KEYS.leaderEmail) ?? '';
  const minerOpenSchedule =
    findValueInRecord(record, DGROUP_CANDIDATE_KEYS.minerOpenSchedule) ?? '';
  const minerOpenSlots = findValueInRecord(record, DGROUP_CANDIDATE_KEYS.minerOpenSlots) ?? '';

  return {
    status: detectDGroupStatus(rawStatus),
    memberSince: formatDGroupMemberSince(rawMemberSince),
    leader,
    leaderContact,
    leaderEmail,
    minerOpenSchedule,
    minerOpenSlots,
  };
}

/** Updates or removes a DGroup key in a metadata_entries array. */
export function updateMetadataWithDGroupField(
  entries: { key: string; value: string }[],
  fieldKey: DGroupMetadataKeyType,
  newValue: string,
): { key: string; value: string }[] {
  const canonicalKey = DGROUP_METADATA_KEYS[fieldKey];
  const candidateKeys = DGROUP_CANDIDATE_KEYS[fieldKey];
  const candidateNormalized = candidateKeys.map(normalizeKey);

  const nextEntries = [...entries];
  const existingIndex = nextEntries.findIndex((e) =>
    candidateNormalized.includes(normalizeKey(e.key)),
  );

  const trimmed = newValue.trim();

  if (trimmed === '') {
    if (existingIndex !== -1) {
      nextEntries.splice(existingIndex, 1);
    }
  } else {
    if (existingIndex !== -1) {
      nextEntries[existingIndex] = { key: canonicalKey, value: trimmed };
    } else {
      nextEntries.push({ key: canonicalKey, value: trimmed });
    }
  }

  return nextEntries;
}
