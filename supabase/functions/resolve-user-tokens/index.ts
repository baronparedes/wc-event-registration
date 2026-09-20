import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const resolveTokensRequestSchema = z.object({
  tokens: z.array(z.string()).optional(),
});

type UserRow = {
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
};

type UserTokenRow = {
  token: string;
  user_id: string;
  users: UserRow | UserRow[] | null;
};

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'resolve-user-tokens',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['slod', 'admin', 'super_admin'],
    schema: resolveTokensRequestSchema,
  });

  if (!guard.valid) return guard.response;

  const tokens = guard.data?.tokens;
  const { corsHeaders, client } = guard;

  try {
    let query = client
      .from('user_tokens')
      .select('token, user_id, users ( nickname, first_name, last_name, full_name )');

    if (tokens && tokens.length > 0) {
      query = query.in('token', tokens);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[resolve-user-tokens] Query error', error);
      return errorResponse(corsHeaders, 500, 'Failed to fetch user tokens');
    }

    const rows = (data ?? []) as unknown as UserTokenRow[];

    const resolvedTokens = rows.reduce(
      (acc, row) => {
        const user = row.users;
        const userObj = Array.isArray(user) ? user[0] : user;

        const displayName =
          userObj?.nickname || userObj?.first_name || userObj?.full_name || row.token;
        acc[row.token] = {
          id: row.user_id,
          name: displayName,
          fullName: userObj?.full_name ?? null,
          firstName: userObj?.first_name ?? null,
          lastName: userObj?.last_name ?? null,
          nickname: userObj?.nickname ?? null,
        };
        return acc;
      },
      {} as Record<
        string,
        {
          id: string;
          name: string;
          fullName: string | null;
          firstName: string | null;
          lastName: string | null;
          nickname: string | null;
        }
      >,
    );

    return successResponse(corsHeaders, { data: resolvedTokens }, 200);
  } catch (err) {
    console.error('[resolve-user-tokens] Unexpected error', err);
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
