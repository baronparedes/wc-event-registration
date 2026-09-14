import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import type { ToolContext } from './types.ts';

export function createGetUserCommitmentsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z.string().optional().describe('Filter by user role (e.g., "prayer coach", "usher").'),
    sunday_availability: z
      .enum(['first_sunday', 'second_sunday', 'third_sunday', 'fourth_sunday', 'fifth_sunday'])
      .optional()
      .describe('Filter by availability on a specific Sunday.'),
  });

  return tool({
    description:
      'Retrieve a list of user tokens and the total count of users matching specific roles or Sunday availability commitments. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ role, sunday_availability }) => {
      console.log('[chat:tool:getUserCommitments] Executing', {
        role,
        sunday_availability,
        requestId,
      });

      // Start the query on users
      let query = client.from('users').select(`
          role,
          metadata,
          user_tokens ( token )
        `);

      if (role) {
        // Assume role might be stored in the top-level 'role' column or inside metadata.
        // It's safer to filter in JS if it's case-insensitive or complex, but let's try direct DB filter for the column first, or just fetch and filter.
        // For simplicity and to handle metadata JSON accurately, we can fetch users and filter in-memory if dataset isn't huge, or use PostgREST filters.
        // Let's use ilike on role column
        query = query.ilike('role', `%${role.trim()}%`);
      }

      // If sunday_availability is provided, we can filter using JSONB containment.
      // E.g., metadata->>'first_sunday' == 'true'
      if (sunday_availability) {
        query = query.eq(`metadata->>${sunday_availability}`, 'true');
      }

      const { data, error } = await query;

      if (error) {
        console.error('[chat:tool:getUserCommitments] Query error', error);
        return { error: error.message };
      }

      const tokens = (data || [])
        .map((u) => {
          const tokensArray = u.user_tokens;
          if (Array.isArray(tokensArray)) {
            return tokensArray[0]?.token;
          }
          return (tokensArray as { token?: string })?.token;
        })
        .filter(Boolean);

      return {
        count: tokens.length,
        tokens,
      };
    },
  });
}
