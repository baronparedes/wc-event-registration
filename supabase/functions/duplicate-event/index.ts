import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const duplicateEventSchema = z.object({
  source_event_id: z.string().uuid('Invalid source event ID.'),
  new_title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  new_slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Slug must use only lowercase letters, numbers, and hyphens'),
});

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'duplicate-event',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'duplicate-event',
      windowMs: RATE_LIMIT_PRESETS.defaultAdmin.windowMs,
      maxHits: RATE_LIMIT_PRESETS.defaultAdmin.maxHits,
    },
    schema: duplicateEventSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const payload = guard.data;
    const adminClient = guard.client;

    // 1. Check if the slug is unique
    const { data: existingEvent, error: checkError } = await adminClient
      .from('events')
      .select('id')
      .eq('slug', payload.new_slug)
      .maybeSingle();

    if (checkError) {
      return errorResponse(corsHeaders, 500, 'Failed to check slug uniqueness', checkError.message);
    }

    if (existingEvent) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'An event with this slug already exists. Please choose a different slug.',
          error_code: 'DUPLICATE_SLUG',
        },
        400,
      );
    }

    // 2. Fetch the source event details
    const { data: sourceEvent, error: sourceError } = await adminClient
      .from('events')
      .select('*')
      .eq('id', payload.source_event_id)
      .single();

    if (sourceError || !sourceEvent) {
      return errorResponse(corsHeaders, 404, 'Source event not found', sourceError?.message);
    }

    const newEventId = crypto.randomUUID();

    // 3. Create the new event
    const { error: insertError } = await adminClient.from('events').insert({
      id: newEventId,
      title: payload.new_title,
      slug: payload.new_slug,
      description: sourceEvent.description,
      location: sourceEvent.location,
      starts_at: sourceEvent.starts_at,
      ends_at: sourceEvent.ends_at,
      registration_opens_at: sourceEvent.registration_opens_at,
      registration_closes_at: sourceEvent.registration_closes_at,
      status: 'draft',
      duplicate_policy: sourceEvent.duplicate_policy,
      registration_mode: sourceEvent.registration_mode,
      allow_public_registrations: sourceEvent.allow_public_registrations,
      require_id_lookup: sourceEvent.require_id_lookup,
      metadata: sourceEvent.metadata,
      created_by_admin_id: guard.session?.user?.id
        ? // Let's rely on the trigger/admin mapping or we can just pass null, the client usually passes created_by_admin_id or we can fetch it
          // For edge functions, since we use adminClient, we can query admin id.
          null
        : null,
    });

    if (insertError) {
      return errorResponse(corsHeaders, 500, 'Failed to create new event', insertError.message);
    }

    // We need to resolve the admin ID actually if possible. Let's do it right.

    const { data: adminRow } = await adminClient
      .from('admins')
      .select('id')
      .eq('auth_user_id', guard.session.user.id)
      .maybeSingle();

    if (adminRow) {
      await adminClient
        .from('events')
        .update({ created_by_admin_id: adminRow.id })
        .eq('id', newEventId);
    }

    // 4. Copy event_fields
    const { data: eventFields } = await adminClient
      .from('event_fields')
      .select('*')
      .eq('event_id', payload.source_event_id);

    if (eventFields && eventFields.length > 0) {
      const newFields = eventFields.map((field) => ({
        ...field,
        id: crypto.randomUUID(),
        event_id: newEventId,
        created_at: undefined,
        updated_at: undefined,
      }));
      await adminClient.from('event_fields').insert(newFields);
    }

    // 5. Copy attendance_settings
    const { data: attendanceSettings } = await adminClient
      .from('attendance_settings')
      .select('*')
      .eq('event_id', payload.source_event_id)
      .maybeSingle();

    if (attendanceSettings) {
      await adminClient.from('attendance_settings').insert({
        ...attendanceSettings,
        event_id: newEventId,
        created_at: undefined,
        updated_at: undefined,
      });
    }

    // 6. Copy attendance_fields
    const { data: attendanceFields } = await adminClient
      .from('attendance_fields')
      .select('*')
      .eq('event_id', payload.source_event_id);

    if (attendanceFields && attendanceFields.length > 0) {
      const newAttendanceFields = attendanceFields.map((field) => ({
        ...field,
        id: crypto.randomUUID(),
        event_id: newEventId,
        created_at: undefined,
        updated_at: undefined,
      }));
      await adminClient.from('attendance_fields').insert(newAttendanceFields);
    }

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        new_event_id: newEventId,
      },
      200,
    );
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
