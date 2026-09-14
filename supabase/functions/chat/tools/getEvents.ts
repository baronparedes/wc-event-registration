import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import type { ToolContext } from './types.ts';

export function createGetEventsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    status: z
      .enum(['open', 'closed', 'all'])
      .default('all')
      .describe('Filter events by registration mode (open, closed, or all)'),
    timeframe: z
      .enum(['upcoming', 'past', 'all'])
      .default('all')
      .describe(
        'Filter events by schedule: "upcoming" to filter out past events and return only future or currently ongoing events; "past" for completed events; "all" for all events. Always use "upcoming" when the user asks for upcoming, next, future, or scheduled events.',
      ),
    search: z
      .string()
      .optional()
      .describe(
        'Optional search keyword to filter events by specific title topic (e.g. "Baptism", "Retreat"). Do NOT pass generic words like "upcoming", "past", or "events" here.',
      ),
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
      'Retrieve events from the database with their schedule, location, registration status, and app URLs (admin_url, public_url).',
    parameters: schema,
    inputSchema: schema,
    execute: async ({ status, timeframe = 'all', search, limit }) => {
      console.log('[chat:tool:getEvents] Executing', {
        status,
        timeframe,
        search,
        limit,
        requestId,
      });

      // Automatically detect and handle keywords like "upcoming", "future", "past" in search
      let effectiveTimeframe = timeframe;
      let effectiveSearch = search?.trim();

      if (effectiveSearch) {
        const lowerSearch = effectiveSearch.toLowerCase();
        if (/^(upcoming|future|next)(\s+events?)?$/i.test(lowerSearch)) {
          effectiveTimeframe = 'upcoming';
          effectiveSearch = undefined;
        } else if (/^(past|previous|ended|completed)(\s+events?)?$/i.test(lowerSearch)) {
          effectiveTimeframe = 'past';
          effectiveSearch = undefined;
        } else if (/\b(upcoming|future|next)\b/i.test(effectiveSearch)) {
          effectiveTimeframe = 'upcoming';
          effectiveSearch = effectiveSearch
            .replace(/\b(upcoming|future|next)\b/gi, '')
            .replace(/\bevents?\b/gi, '')
            .trim();
        } else if (/\b(past|previous)\b/i.test(effectiveSearch)) {
          effectiveTimeframe = 'past';
          effectiveSearch = effectiveSearch
            .replace(/\b(past|previous)\b/gi, '')
            .replace(/\bevents?\b/gi, '')
            .trim();
        } else if (/^events?$/i.test(lowerSearch)) {
          effectiveSearch = undefined;
        }
      }

      const nowIso = new Date().toISOString();
      let query = client
        .from('events')
        .select(
          'id, title, slug, description, starts_at, ends_at, registration_opens_at, registration_closes_at, status, registration_mode, location',
        );

      if (effectiveTimeframe === 'upcoming') {
        // Events that have not finished yet (ends_at >= now, or if ends_at is null, starts_at >= now)
        query = query.or(`ends_at.gte.${nowIso},starts_at.gte.${nowIso}`);
        query = query.order('starts_at', { ascending: true, nullsFirst: false });
      } else if (effectiveTimeframe === 'past') {
        // Events that have finished
        query = query.or(`ends_at.lt.${nowIso},and(ends_at.is.null,starts_at.lt.${nowIso})`);
        query = query.order('starts_at', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('starts_at', { ascending: false, nullsFirst: false });
      }

      if (status === 'open') {
        query = query.eq('registration_mode', 'open');
      } else if (status === 'closed') {
        query = query.eq('registration_mode', 'closed');
      }

      if (effectiveSearch && effectiveSearch.trim()) {
        query = query.ilike('title', `%${effectiveSearch.trim()}%`);
      }

      query = query.limit(limit);

      const { data, error } = await query;
      if (error) {
        console.error('[chat:tool:getEvents] Query error', error);
        return { error: error.message };
      }

      const nowMs = Date.now();
      const enrichedEvents = (data ?? []).map((event) => {
        const startsAtMs = event.starts_at ? Date.parse(event.starts_at) : null;
        const endsAtMs = event.ends_at ? Date.parse(event.ends_at) : null;
        const referenceEnd = endsAtMs ?? startsAtMs;

        let time_status: 'upcoming' | 'ongoing' | 'past' | 'unscheduled' = 'unscheduled';
        if (referenceEnd !== null) {
          if (referenceEnd < nowMs) {
            time_status = 'past';
          } else if (startsAtMs !== null && startsAtMs <= nowMs) {
            time_status = 'ongoing';
          } else {
            time_status = 'upcoming';
          }
        }

        return {
          ...event,
          time_status,
          admin_url: `/admin/events/${event.id}`,
          public_url: event.slug ? `/events/${event.slug}/register` : null,
        };
      });

      let finalEvents = enrichedEvents;
      if (effectiveTimeframe === 'upcoming') {
        finalEvents = enrichedEvents.filter(
          (e) => e.time_status === 'upcoming' || e.time_status === 'ongoing',
        );
      } else if (effectiveTimeframe === 'past') {
        finalEvents = enrichedEvents.filter((e) => e.time_status === 'past');
      }

      console.log('[chat:tool:getEvents] Fetched events:', {
        count: finalEvents.length,
        effectiveTimeframe,
        effectiveSearch,
        events: finalEvents.map((e) => ({
          title: e.title,
          starts_at: e.starts_at,
          time_status: e.time_status,
        })),
      });

      return { events: finalEvents };
    },
  });
}
