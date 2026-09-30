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

type UserRow = {
  id: string;
  member_id: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  category: string | null;
};

const rpcResultSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      member_id: z.string().nullable(),
      full_name: z.string().nullable(),
      email: z.string().nullable(),
      role: z.string().nullable(),
      category: z.string().nullable(),
    }),
  ),
  total_count: z.number().int().nonnegative(),
});

function readOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function handleListUnregisteredMembers(req: Request): Promise<Response> {
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
    const normalizedSearchTerm = search_term?.trim() ?? '';

    const { data: result, error: rpcError } = await adminClient
      .rpc('list_unregistered_members', {
        p_event_id: event_id,
        p_page_size: page_size,
        p_offset: offset,
        p_search_term: normalizedSearchTerm || null,
      })
      .single();

    if (rpcError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to load unregistered members',
        rpcError.message,
      );
    }

    const parsedResult = rpcResultSchema.safeParse(result);
    if (!parsedResult.success) {
      return errorResponse(corsHeaders, 500, 'Failed to load unregistered members');
    }

    const items = parsedResult.data.items.map((user: UserRow) => ({
      user_id: user.id,
      member_id: user.member_id,
      full_name: user.full_name ?? user.member_id ?? 'Unnamed member',
      email: user.email,
      role: readOptionalText(user.role),
      category: readOptionalText(user.category),
    }));

    const totalCount = parsedResult.data.total_count;
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
    console.error('[list-unregistered-members] unexpected error:', error);
    return errorResponse(corsHeaders, 500, 'Failed to list unregistered members');
  }
}
