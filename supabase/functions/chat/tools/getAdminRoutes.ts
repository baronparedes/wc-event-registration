import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import type { ToolContext } from './types.ts';

const routeSchema = z.enum([
  'hub_calendar',
  'events',
  'event_new',
  'event_detail',
  'event_registrations',
  'event_attendance',
  'members',
  'members_import',
  'member_detail',
  'user_roles',
  'forms',
  'form_detail',
  'chat',
]);

export function createGetAdminRoutesTool({ requestId }: ToolContext) {
  const schema = z.object({
    route: routeSchema.describe('The admin destination to link to.'),
    id: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('The event, member, or form ID when required.'),
  });

  return tool({
    description:
      'Resolve canonical admin route URLs for links in assistant responses. Use this instead of inventing or guessing admin paths.',
    parameters: schema,
    execute: async ({ route, id }) => {
      console.log('[chat:tool:getAdminRoutes] Resolving route', { route, id, requestId });

      const paths: Record<typeof route, string> = {
        hub_calendar: '/admin/hub-calendar',
        events: '/admin/events',
        event_new: '/admin/events/new',
        event_detail: `/admin/events/${id ?? ''}`,
        event_registrations: `/admin/events/${id ?? ''}/registrations`,
        event_attendance: `/admin/events/${id ?? ''}/attendance`,
        members: '/admin/members',
        members_import: '/admin/members/import',
        member_detail: `/admin/members/${id ?? ''}`,
        user_roles: '/admin/users/roles',
        forms: '/admin/forms',
        form_detail: `/admin/forms/${id ?? ''}`,
        chat: '/admin/chat',
      };

      const requiresId =
        route === 'event_detail' ||
        route === 'event_registrations' ||
        route === 'event_attendance' ||
        route === 'member_detail' ||
        route === 'form_detail';
      if (requiresId && !id) return { error: `The ${route} route requires an id.` };

      return {
        route,
        url: paths[route],
      };
    },
  });
}
