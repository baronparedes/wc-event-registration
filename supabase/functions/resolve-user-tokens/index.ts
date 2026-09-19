import { z } from 'npm:zod';

import { errorResponse, useEdgeHook } from '../_shared/index.ts';

const resolveTokensRequestSchema = z.object({
  tokens: z.array(z.string()).max(100),
});

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

  const { tokens } = guard.data;
  const { corsHeaders, client } = guard;

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ data: {} }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const { data, error } = await client
      .from('user_tokens')
      .select('token, user_id, users ( nickname, first_name, full_name )')
      .in('token', tokens);

    if (error) {
      console.error('[resolve-user-tokens] Query error', error);
      return errorResponse(corsHeaders, 500, 'Failed to fetch user tokens');
    }

    const resolvedTokens = data.reduce(
      (acc, row) => {
        const user = row.users;
        // Handle the case where users might be returned as an array or object depending on relationship setup.
        // Usually it's an object for a many-to-one or one-to-one.
        const userObj = Array.isArray(user) ? user[0] : user;

        const displayName =
          userObj?.nickname || userObj?.first_name || userObj?.full_name || 'Unknown';
        acc[row.token] = {
          id: row.user_id,
          name: displayName,
        };
        return acc;
      },
      {} as Record<string, { id: string; name: string }>,
    );

    return new Response(JSON.stringify({ data: resolvedTokens }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    console.error('[resolve-user-tokens] Unexpected error', err);
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
