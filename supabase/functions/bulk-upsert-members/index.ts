import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

type ExistingMember = {
  id: string;
  member_id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
};

type ResolvedUpsertRow = {
  operation: 'insert' | 'update';
  target_id?: string;
  member_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
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
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const requestSchema = z.object({
  rows: z.array(rowSchema).min(1, 'rows must include at least one item'),
});

type RequestPayload = z.infer<typeof requestSchema>;
type InputRow = RequestPayload['rows'][number];

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

function resolveRows(
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

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'bulk-upsert-members',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'bulk-upsert-members',
      windowMs: RATE_LIMIT_PRESETS.bulkUpsertMembers.windowMs,
      maxHits: RATE_LIMIT_PRESETS.bulkUpsertMembers.maxHits,
    },
    schema: requestSchema,
  });

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { rows }: RequestPayload = guard.data;
    const adminClient = guard.client;
    const corsHeaders = guard.corsHeaders;

    const { data: existingMembers, error: membersError } = await adminClient
      .from('users')
      .select('id, member_id, first_name, last_name, nickname, email');

    if (membersError) {
      return errorResponse(corsHeaders, 500, 'Failed to load existing members');
    }

    const { resolvedRows, errors } = resolveRows(rows, (existingMembers ?? []) as ExistingMember[]);

    if (errors.length > 0) {
      return errorResponse(corsHeaders, 400, 'CSV validation failed. Import aborted.', undefined, {
        detail: errors.slice(0, 50).join('; '),
        details: errors.slice(0, 50),
        total_errors: errors.length,
      });
    }

    const { data: upsertResult, error: upsertError } = await adminClient.rpc(
      'apply_bulk_member_upsert',
      {
        p_rows: resolvedRows,
      },
    );

    if (upsertError) {
      return errorResponse(
        corsHeaders,
        500,
        upsertError.message || 'Failed to apply member import',
      );
    }

    const summary = Array.isArray(upsertResult) ? upsertResult[0] : upsertResult;
    const insertedCount = Number(summary?.inserted_count ?? 0);
    const updatedCount = Number(summary?.updated_count ?? 0);

    return successResponse(corsHeaders, {
      inserted_count: insertedCount,
      updated_count: updatedCount,
      imported_count: insertedCount + updatedCount,
    });
  } catch (error) {
    console.error('[bulk-upsert-members] unhandled error', error);
    return errorResponse(guard.corsHeaders, 500, 'Unexpected server error');
  }
});
