import { z } from '@/shared/validation.ts';

export type ExistingMember = {
  id: string;
  member_id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
};

export type ResolvedUpsertRow = {
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
};

const rowSchema = z.object({
  row_number: z.number().int().positive(),
  member_id: z.string().trim().min(1, 'member_id is required').max(100),
  first_name: z.string().trim().min(1, 'first_name is required').max(100),
  last_name: z.string().trim().min(1, 'last_name is required').max(100),
  nickname: z.string().trim().min(1, 'nickname is required').max(100),
  email: z.string().trim().max(320).nullable(),
  phone: z.string().trim().max(50).nullable(),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  role: z.string().trim().min(1, 'role is required').max(100),
  category: z.string().trim().min(1, 'category is required').max(100),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const requestSchema = z.object({
  rows: z.array(rowSchema).min(1, 'rows must include at least one item'),
});

export type RequestPayload = z.infer<typeof requestSchema>;
export type InputRow = RequestPayload['rows'][number];

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
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

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = normalizeText(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolveRows(
  rows: InputRow[],
  existingMembers: ExistingMember[],
): {
  resolvedRows: ResolvedUpsertRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const resolvedRows: ResolvedUpsertRow[] = [];

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
    const rowPrefix = `Row ${row.row_number}`;
    const rowErrors: string[] = [];

    if ((memberIdCounts.get(row.member_id) ?? 0) > 1) {
      rowErrors.push('Member ID appears multiple times in this CSV batch.');
    }

    const tripletKey = normalizeTriplet(row.first_name, row.last_name, row.nickname);
    if ((tripletCounts.get(tripletKey) ?? 0) > 1) {
      rowErrors.push('Firstname + Surname + Nickname appears multiple times in this CSV batch.');
    }

    const normalizedEmail = normalizeEmail(row.email);
    if (normalizedEmail && (emailCounts.get(normalizedEmail) ?? 0) > 1) {
      rowErrors.push('Email appears multiple times in this CSV batch.');
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

    let resolved: ResolvedUpsertRow | null = null;

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
        };
      }
    }

    if (resolved?.target_id) {
      if (targetedIds.has(resolved.target_id)) {
        rowErrors.push('Another row already targets this same member.');
      }
      targetedIds.add(resolved.target_id);
    }

    if (resolved && normalizedEmail) {
      const emailOwnerId = emailMap.get(normalizedEmail) ?? null;
      if (emailOwnerId && emailOwnerId !== resolved.target_id) {
        rowErrors.push('Email already belongs to another member record.');
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors.map((message) => `${rowPrefix}: ${message}`));
      continue;
    }

    if (resolved) {
      resolvedRows.push(resolved);
    }
  }

  return { resolvedRows, errors };
}
