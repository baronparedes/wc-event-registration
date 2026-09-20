import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { parseIsoDate } from './timeframes.ts';
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
        'Directional filter: "upcoming" for future/ongoing events; "past" for completed events; "all" for no directional filter. Ignored when targetStartDate or targetEndDate are provided.',
      ),
    targetStartDate: z
      .string()
      .optional()
      .describe(
        'Precise start of the date range in YYYY-MM-DD format. When provided, overrides the timeframe enum and filters events whose starts_at is on or after this date.',
      ),
    targetEndDate: z
      .string()
      .optional()
      .describe(
        'Precise end of the date range in YYYY-MM-DD format. When provided, overrides the timeframe enum and filters events whose starts_at is on or before this date.',
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
      'Retrieve events from the database with their schedule, location, registration status, registration counts (member_registrations, public_registrations, total_registrations), and app URLs (admin_url, public_url). Provide targetStartDate and targetEndDate for precise date-range filtering, or use timeframe for a directional filter.',
    parameters: schema,
    inputSchema: schema,
    execute: async ({
      status,
      timeframe = 'all',
      targetStartDate,
      targetEndDate,
      search,
      limit,
    }) => {
      const startDate = parseIsoDate(targetStartDate);
      const endDate = parseIsoDate(targetEndDate);
      const hasDateRange = startDate !== null || endDate !== null;

      console.log('[chat:tool:getEvents] Executing', {
        status,
        timeframe,
        targetStartDate,
        targetEndDate,
        hasDateRange,
        search,
        limit,
        requestId,
      });

      const nowIso = new Date().toISOString();
      let query = client
        .from('events')
        .select(
          'id, title, slug, description, starts_at, ends_at, registration_opens_at, registration_closes_at, status, registration_mode, location',
        );

      if (hasDateRange) {
        // Precise date-range mode — filter on starts_at directly
        if (startDate) {
          const startIso = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            0,
            0,
            0,
          ).toISOString();
          query = query.gte('starts_at', startIso);
        }
        if (endDate) {
          const endIso = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23,
            59,
            59,
          ).toISOString();
          query = query.lte('starts_at', endIso);
        }
        query = query.order('starts_at', { ascending: true, nullsFirst: false });
      } else if (timeframe === 'upcoming') {
        query = query.or(`ends_at.gte.${nowIso},starts_at.gte.${nowIso}`);
        query = query.order('starts_at', { ascending: true, nullsFirst: false });
      } else if (timeframe === 'past') {
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

      const effectiveSearch = search?.trim();
      if (effectiveSearch) {
        query = query.ilike('title', `%${effectiveSearch}%`);
      }

      query = query.limit(limit);

      const { data, error } = await query;
      if (error) {
        console.error('[chat:tool:getEvents] Query error', error);
        return { error: error.message };
      }

      // Concurrently fetch registration counts (both member and public) for each event
      const eventCounts = await Promise.all(
        (data ?? []).map(async (event) => {
          try {
            const [memberRes, publicRes] = await Promise.all([
              client.rpc('get_event_registration_count', { p_event_id: event.id }),
              client.rpc('get_public_event_registration_count', { p_event_id: event.id }),
            ]);

            const memberCount =
              typeof memberRes.data === 'number' ? memberRes.data : Number(memberRes.data ?? 0);
            const publicCount =
              typeof publicRes.data === 'number' ? publicRes.data : Number(publicRes.data ?? 0);

            return {
              id: event.id,
              member_registrations: Number.isFinite(memberCount) ? memberCount : 0,
              public_registrations: Number.isFinite(publicCount) ? publicCount : 0,
            };
          } catch (err) {
            console.warn('[chat:tool:getEvents] Failed to fetch registration counts for event', {
              eventId: event.id,
              error: err,
            });
            return {
              id: event.id,
              member_registrations: 0,
              public_registrations: 0,
            };
          }
        }),
      );

      const countsMap = new Map(eventCounts.map((c) => [c.id, c]));

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

        const counts = countsMap.get(event.id);
        const member_registrations = counts?.member_registrations ?? 0;
        const public_registrations = counts?.public_registrations ?? 0;
        const total_registrations = member_registrations + public_registrations;

        return {
          ...event,
          time_status,
          member_registrations,
          public_registrations,
          total_registrations,
          admin_url: `/admin/events/${event.id}`,
          public_url: event.slug ? `/events/${event.slug}/register` : null,
        };
      });

      // In date-range mode we trust the DB filter; in timeframe mode apply a secondary guard
      let finalEvents = enrichedEvents;
      if (!hasDateRange) {
        if (timeframe === 'upcoming') {
          finalEvents = enrichedEvents.filter(
            (e) => e.time_status === 'upcoming' || e.time_status === 'ongoing',
          );
        } else if (timeframe === 'past') {
          finalEvents = enrichedEvents.filter((e) => e.time_status === 'past');
        }
      }

      console.log('[chat:tool:getEvents] Fetched events:', {
        count: finalEvents.length,
        timeframe,
        hasDateRange,
        targetStartDate,
        targetEndDate,
        effectiveSearch,
        events: finalEvents.map((e) => ({
          title: e.title,
          starts_at: e.starts_at,
          time_status: e.time_status,
          member_registrations: e.member_registrations,
          public_registrations: e.public_registrations,
          total_registrations: e.total_registrations,
          admin_url: e.admin_url,
        })),
      });

      return { events: finalEvents };
    },
  });
}
