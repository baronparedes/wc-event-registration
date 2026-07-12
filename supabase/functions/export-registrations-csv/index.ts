import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  logAdminAction,
  readAllowedOrigins,
  requireAdminAccess,
} from '@/shared/security.ts';
import { parseFunctionEnvironment, parseRequestBody, z } from '@/shared/validation.ts';

const exportRegistrationsRequestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
  response_mode: z.enum(['csv', 'names_json']).optional(),
});

type ExportRegistrationsRequest = z.infer<typeof exportRegistrationsRequestSchema>;

const allowedOrigins = readAllowedOrigins();

function maskValue(value: string | null, visible = 6): string {
  if (!value) return 'null';
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

type RegistrationShareRow = {
  full_name: string;
  member_id: string;
  email: string;
  phone: string;
  metadata: string;
  role: string;
  category: string;
  registration_status: string;
  submitted_at: string;
  updated_at: string;
  answer_values: Record<string, string>;
};

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  try {
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }

    const entries = Object.entries(value as Record<string, unknown>)
      .filter(
        ([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '',
      )
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    if (entries.length === 0) {
      return '';
    }

    return entries
      .map(([key, entryValue]) => {
        if (typeof entryValue === 'string') {
          return `${key}: ${entryValue}`;
        }
        return `${key}: ${JSON.stringify(entryValue)}`;
      })
      .join('; ');
  } catch {
    return '';
  }
}

// Helper function to escape CSV fields
function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return '';
  }

  let value = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    value = '"' + value.replace(/"/g, '""') + '"';
  }

  return value;
}

// Helper to format answer value based on type
function formatAnswerValue(answer: unknown, fieldType: string): string {
  if (answer === null || answer === undefined) {
    return '';
  }

  if (fieldType === 'boolean') {
    return answer === true ? 'true' : answer === false ? 'false' : String(answer);
  }

  if (fieldType === 'date' || fieldType === 'datetime') {
    if (typeof answer === 'string') {
      return answer;
    }
    return String(answer);
  }

  if (fieldType === 'multi_select' || fieldType === 'checkbox') {
    if (Array.isArray(answer)) {
      return answer.join('; ');
    }
    return String(answer);
  }

  if (fieldType === 'multi_select_toggle') {
    if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
      return Object.entries(answer as Record<string, unknown>)
        .map(
          ([key, value]) =>
            `${key}: ${value === true ? 'Yes' : value === false ? 'No' : String(value)}`,
        )
        .join('; ');
    }
    return String(answer);
  }

  return String(answer);
}

function formatBaseHeader(field: string): string {
  return field
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildUtcTimestampForFilename(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  console.log('[export-registrations-csv]', {
    requestId,
    method: req.method,
    origin,
    hasAuthorizationHeader: Boolean(req.headers.get('authorization')),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return createObscuredDenyResponse(corsHeaders);
    }

    return new Response('ok', { headers: corsHeaders });
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return createObscuredDenyResponse(corsHeaders);
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const env = parseFunctionEnvironment();
    const authHeader = req.headers.get('authorization');

    console.log('[export-registrations-csv] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(env?.supabaseUrl),
      hasServiceRoleKey: Boolean(env?.supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
      authHeaderPrefix: authHeader?.split(' ')[0] ?? null,
      authHeaderLength: authHeader?.length ?? 0,
    });

    if (!env) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Environment not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    const { supabaseUrl, supabaseServiceKey } = env;

    const parsedBody = await parseRequestBody(req, exportRegistrationsRequestSchema);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: parsedBody.error,
          detail: parsedBody.details,
          error_code: 'INVALID_REQUEST',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { event_id, response_mode }: ExportRegistrationsRequest = parsedBody.data;

    console.log('[export-registrations-csv] parsed body', {
      requestId,
      hasEventId: Boolean(event_id),
      eventId: maskValue(event_id ?? null),
    });

    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'export-registrations-csv',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'export-registrations-csv',
        windowMs: 60_000,
        maxHits: 5,
      },
    });

    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    // Create service role client for privileged operations after auth check
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch event metadata for friendly export filename
    const { data: eventData } = await adminClient
      .from('events')
      .select('title')
      .eq('id', event_id)
      .single();

    // Fetch all registrations for the event
    const { data: registrations, error: regError } = await adminClient
      .from('registrations')
      .select('id, user_id, status, submitted_at, updated_at')
      .eq('event_id', event_id)
      .order('submitted_at', { ascending: false });

    console.log('[export-registrations-csv] registration query result', {
      requestId,
      eventId: maskValue(event_id),
      registrationCount: registrations?.length ?? 0,
      regErrorCode: regError?.code ?? null,
    });

    if (regError) {
      console.error('Registration fetch error:', regError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch registrations',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Fetch user details for all registrations
    const userIds = registrations?.map((r) => r.user_id) ?? [];
    const { data: users, error: userError } = await adminClient
      .from('users')
      .select('id, member_id, full_name, email, phone, role, category, metadata')
      .in('id', userIds);

    if (userError) {
      console.error('User fetch error:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch user data',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Fetch all event fields for this event in display order
    const { data: fields, error: fieldError } = await adminClient
      .from('event_fields')
      .select('id, field_key, label, field_type')
      .eq('event_id', event_id)
      .order('display_order', { ascending: true });

    if (fieldError) {
      console.error('Field fetch error:', fieldError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch event fields',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Fetch all registration answers for all registrations
    const regIds = registrations?.map((r) => r.id) ?? [];
    const { data: allAnswers, error: answerError } = await adminClient
      .from('registration_answers')
      .select(
        'registration_id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json',
      )
      .in('registration_id', regIds);

    if (answerError) {
      console.error('Answer fetch error:', answerError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch registration answers',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Build lookup maps for efficient access
    const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);
    const fieldMap = new Map(fields?.map((f) => [f.id, f]) ?? []);
    const answersByRegistration = new Map<string, Map<string, unknown>>();

    allAnswers?.forEach((answer) => {
      if (!answersByRegistration.has(answer.registration_id)) {
        answersByRegistration.set(answer.registration_id, new Map());
      }

      const field = fieldMap.get(answer.event_field_id);
      let answerValue: unknown = null;

      if (field) {
        // submit-registration stores all answers in answer_text (JSON string for complex fields)
        const rawAnswer = answer.answer_text;
        if (rawAnswer === null || rawAnswer === undefined || rawAnswer === '') {
          answerValue = null;
        } else if (
          field.field_type === 'select' ||
          field.field_type === 'radio' ||
          field.field_type === 'multi_select' ||
          field.field_type === 'multi_select_toggle' ||
          field.field_type === 'checkbox'
        ) {
          try {
            answerValue = JSON.parse(rawAnswer);
          } catch {
            answerValue = rawAnswer;
          }
        } else if (field.field_type === 'number') {
          const parsed = Number(rawAnswer);
          answerValue = Number.isNaN(parsed) ? rawAnswer : parsed;
        } else if (field.field_type === 'boolean') {
          answerValue = rawAnswer === 'true' || rawAnswer === '1';
        } else {
          answerValue = rawAnswer;
        }
      }

      answersByRegistration.get(answer.registration_id)?.set(answer.event_field_id, answerValue);
    });

    const shareRows: RegistrationShareRow[] =
      registrations?.map((reg) => {
        const user = userMap.get(reg.user_id);
        const answerValues: Record<string, string> = {};

        fields?.forEach((field) => {
          const answer = answersByRegistration.get(reg.id)?.get(field.id);
          answerValues[field.id] = formatAnswerValue(answer, field.field_type);
        });

        return {
          full_name: user?.full_name ?? '',
          member_id: user?.member_id ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? '',
          metadata: formatMetadataValue(user?.metadata),
          role: readMetadataString(user?.role),
          category: readMetadataString(user?.category),
          registration_status: reg.status ?? '',
          submitted_at: reg.submitted_at ?? '',
          updated_at: reg.updated_at ?? '',
          answer_values: answerValues,
        };
      }) ?? [];

    const answerFields =
      fields?.map((field) => ({
        field_id: field.id,
        label: field.label || formatBaseHeader(field.field_key),
      })) ?? [];

    if (response_mode === 'names_json') {
      await logAdminAction({
        adminClient,
        adminUserId: adminAccess.userId,
        action: 'export_registration_names',
        resourceType: 'export',
        resourceId: event_id,
        metadata: {
          event_id,
          row_count: shareRows.length,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          event_title: eventData?.title ?? '',
          row_count: shareRows.length,
          answer_fields: answerFields,
          rows: shareRows,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Build CSV content
    const headers: string[] = [
      formatBaseHeader('member_id'),
      formatBaseHeader('full_name'),
      formatBaseHeader('email'),
      formatBaseHeader('phone'),
      formatBaseHeader('role'),
      formatBaseHeader('category'),
      formatBaseHeader('status'),
      formatBaseHeader('submitted_at'),
      formatBaseHeader('updated_at'),
    ];
    fields?.forEach((f) => {
      headers.push(f.label || formatBaseHeader(f.field_key));
    });

    const csvLines: string[] = [headers.map((h) => escapeCsvField(h)).join(',')];

    registrations?.forEach((reg) => {
      const user = userMap.get(reg.user_id);
      const row: string[] = [
        escapeCsvField(user?.member_id ?? ''),
        escapeCsvField(user?.full_name ?? ''),
        escapeCsvField(user?.email ?? ''),
        escapeCsvField(user?.phone ?? ''),
        escapeCsvField(readMetadataString(user?.role)),
        escapeCsvField(readMetadataString(user?.category)),
        escapeCsvField(reg.status),
        escapeCsvField(reg.submitted_at),
        escapeCsvField(reg.updated_at),
      ];

      fields?.forEach((f) => {
        const answer = answersByRegistration.get(reg.id)?.get(f.id);
        const formatted = formatAnswerValue(answer, f.field_type);
        row.push(escapeCsvField(formatted));
      });

      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');
    const eventName = sanitizeFilenamePart(eventData?.title ?? '');
    const filenamePrefix = eventName || `event-${sanitizeFilenamePart(event_id)}`;
    const timestamp = buildUtcTimestampForFilename(new Date());
    const filename = `${filenamePrefix}-registrations-${timestamp}.csv`;

    await logAdminAction({
      adminClient,
      adminUserId: adminAccess.userId,
      action: 'export_registrations_csv',
      resourceType: 'export',
      resourceId: event_id,
      metadata: {
        event_id,
        row_count: registrations?.length ?? 0,
        filename,
      },
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[export-registrations-csv] unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
