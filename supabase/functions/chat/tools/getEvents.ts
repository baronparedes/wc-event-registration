import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import type { ToolContext } from './types.ts';

export function createGetEventsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    status: z
      .enum(['open', 'closed', 'all'])
      .default('all')
      .describe('Filter events by registration mode (open, closed, or all)'),
    search: z.string().optional().describe('Optional search keyword to filter events by title'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .default(10)
      .describe('Maximum number of events to return'),
  });

  return tool({
    description:
      'Retrieve events from the database with their schedule, location, and registration status.',
    parameters: schema,
    inputSchema: schema,
    execute: async ({ status, search, limit }) => {
      console.log('[chat:tool:getEvents] Executing', { status, search, limit, requestId });
      let query = client
        .from('events')
        .select(
          'id, title, slug, description, starts_at, ends_at, registration_opens_at, registration_closes_at, status, registration_mode, location',
        )
        .order('starts_at', { ascending: false })
        .limit(limit);

      if (status === 'open') {
        query = query.eq('registration_mode', 'open');
      } else if (status === 'closed') {
        query = query.eq('registration_mode', 'closed');
      }

      if (search && search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[chat:tool:getEvents] Query error', error);
        return { error: error.message };
      }
      console.log('[chat:tool:getEvents] Fetched events:', data);
      return { events: data };
    },
  });
}
