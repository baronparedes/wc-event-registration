import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import {
  buildUtcTimestampForFilename,
  escapeCsvField,
  sanitizeFilenamePart,
} from '@/shared/csv.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const requestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID.'),
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

type EventTitleRow = {
  title: string | null;
};

function readOptionalText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'export-unregistered-members-csv',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'export-unregistered-members-csv',
      windowMs: RATE_LIMIT_PRESETS.exportUnregisteredMembersCsv.windowMs,
      maxHits: RATE_LIMIT_PRESETS.exportUnregisteredMembersCsv.maxHits,
    },
    schema: requestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { event_id }: RequestBody = guard.data;
    const adminClient = guard.client;

    const { data: eventData } = (await adminClient
      .from('events')
      .select('title')
      .eq('id', event_id)
      .single()) as { data: EventTitleRow | null };

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
      .select('id, member_id, full_name, email, role, category')
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .order('member_id', { ascending: true });

    if (activeRegistrantUserIds.length > 0) {
      const quotedIds = activeRegistrantUserIds
        .map((id) => `"${id.replaceAll('"', '\\"')}"`)
        .join(',');
      usersQuery = usersQuery.not('id', 'in', `(${quotedIds})`);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to load unregistered members',
        usersError.message,
      );
    }

    const allUsers = (users ?? []) as UserRow[];

    const header = ['Member ID', 'Full Name', 'Email', 'Role', 'Category'];

    const rows = allUsers.map((user) => {
      const fullName = user.full_name?.trim() || user.member_id?.trim() || 'Unnamed member';
      return [
        user.member_id ?? '',
        fullName,
        user.email ?? '',
        readOptionalText(user.role),
        readOptionalText(user.category),
      ];
    });

    const csvContent = [header, ...rows]
      .map((row) => row.map((value) => escapeCsvField(value)).join(','))
      .join('\n');

    const eventName = sanitizeFilenamePart(String(eventData?.title ?? ''));
    const fallbackEventName = sanitizeFilenamePart(event_id);
    const timestamp = buildUtcTimestampForFilename(new Date());
    const filenamePrefix = eventName || `event-${fallbackEventName}`;
    const filename = `${filenamePrefix}-unregistered-members-${timestamp}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
