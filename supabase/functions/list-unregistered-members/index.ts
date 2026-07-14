import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const requestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID.'),
  page_size: z.number().int().min(1).max(200).default(20),
  offset: z.number().int().min(0).default(0),
  search_term: z.string().trim().max(120).optional(),
});

type RequestBody = z.infer<typeof requestSchema>;

type RegistrationRow = {
  user_id: string;
};

type UserRow = {
  id: string;
  member_id: string | null;
  full_name: string | null;
  email: string | null;
  role: unknown;
  category: unknown;
};

function readOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'list-unregistered-members',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'list-unregistered-members',
      windowMs: RATE_LIMIT_PRESETS.listUnregisteredMembers.windowMs,
      maxHits: RATE_LIMIT_PRESETS.listUnregisteredMembers.maxHits,
    },
    schema: requestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { event_id, page_size, offset, search_term }: RequestBody = guard.data;
    const adminClient = guard.client;

    const { data: registrations, error: registrationsError } = await adminClient
      .from('registrations')
      .select('user_id')
      .eq('event_id', event_id)
      .in('status', ['submitted', 'updated']);

    if (registrationsError) {
      return errorResponse(corsHeaders, 500, 'Failed to load event registrations');
    }

    const activeRegistrantUserIds = [
      ...new Set(
        ((registrations ?? []) as RegistrationRow[])
          .map((registration) => registration.user_id)
          .filter((userId) => Boolean(userId)),
      ),
    ];

    let usersQuery = adminClient
      .from('users')
      .select('id, member_id, full_name, email, role, category', { count: 'exact' })
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .order('member_id', { ascending: true })
      .range(offset, offset + page_size - 1);

    if (activeRegistrantUserIds.length > 0) {
      // PostgREST expects string values in in()/not.in() wrapped in double quotes.
      const quotedIds = activeRegistrantUserIds
        .map((id) => `"${id.replaceAll('"', '\\"')}"`)
        .join(',');
      usersQuery = usersQuery.not('id', 'in', `(${quotedIds})`);
    }

    const normalizedSearchTerm = search_term?.trim() ?? '';
    if (normalizedSearchTerm.length > 0) {
      const escapedSearchTerm = escapeOrFilterValue(normalizedSearchTerm);
      usersQuery = usersQuery.or(
        `member_id.ilike.%${escapedSearchTerm}%,full_name.ilike.%${escapedSearchTerm}%,email.ilike.%${escapedSearchTerm}%`,
      );
    }

    const { data: users, count, error: usersError } = await usersQuery;

    if (usersError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to load unregistered members',
        usersError.message,
      );
    }

    const items = ((users ?? []) as UserRow[]).map((user) => ({
      user_id: user.id,
      member_id: user.member_id,
      full_name: user.full_name ?? user.member_id ?? 'Unnamed member',
      email: user.email,
      role: readOptionalText(user.role),
      category: readOptionalText(user.category),
    }));

    const totalCount = count ?? 0;
    const hasMore = offset + items.length < totalCount;

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        items,
        total_count: totalCount,
        has_more: hasMore,
        next_cursor: hasMore ? String(offset + page_size) : null,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return errorResponse(corsHeaders, 500, 'Failed to list unregistered members', message);
  }
});
