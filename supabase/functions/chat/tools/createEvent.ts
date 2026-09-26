import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import type { ToolContext } from './types.ts';

function toUTC8ISO(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/[Z+-]\d{2}(:?\d{2})?$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T') + '+08:00';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T09:00:00+08:00`;
  }

  const normalized = trimmed.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00+08:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}+08:00`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T') + '+08:00';
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapPublicRegistrationAccess(access: 'members' | 'members_and_public' | 'public') {
  switch (access) {
    case 'members':
      return { allow_public_registrations: false, require_id_lookup: true };
    case 'members_and_public':
      return { allow_public_registrations: true, require_id_lookup: true };
    case 'public':
      return { allow_public_registrations: true, require_id_lookup: true };
    default:
      return { allow_public_registrations: false, require_id_lookup: true };
  }
}

const eventFieldSchema = z.object({
  field_key: z
    .string()
    .describe(
      'Unique identifier for this field in this event (e.g. "tshirt_size", "dietary_needs"). Lowercase alphanumeric and underscores only.',
    ),
  label: z.string().describe('Human-readable question or label displayed to registrants.'),
  field_type: z
    .enum([
      'text',
      'textarea',
      'number',
      'email',
      'phone',
      'select',
      'radio',
      'checkbox',
      'multi_select',
      'date',
      'datetime',
      'boolean',
      'color_picker',
    ])
    .default('text')
    .describe('Type of input field.'),
  is_required: z.boolean().default(false).describe('Whether answering this field is mandatory.'),
  applicability: z
    .enum(['members', 'guests', 'both'])
    .default('both')
    .describe(
      'Audience scope: "members" (members only), "guests" (public non-members only), or "both".',
    ),
  placeholder: z.string().optional().describe('Placeholder text for input fields.'),
  help_text: z.string().optional().describe('Help or guidance text shown below the field.'),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional()
    .describe(
      'List of selectable options for choice types (select, radio, checkbox, multi_select).',
    ),
  validation_rules: z
    .record(z.unknown())
    .optional()
    .describe(
      'Optional validation rules, e.g. visibility_rule: { depends_on_field_key, equals_value }, min_length, max_length, max_slots.',
    ),
});

export function createCreateEventTool({ client, requestId, userId }: ToolContext) {
  const schema = z.object({
    title: z.string().min(1).max(200).describe('Title of the event (1-200 characters).'),
    slug: z
      .string()
      .optional()
      .describe(
        'URL-safe slug for the event (e.g. "leadership-summit-2026"). If omitted, it will be automatically generated from the title.',
      ),
    description: z.string().optional().describe('Detailed description of the event.'),
    location: z.string().optional().describe('Venue, hall, room, or location of the event.'),
    startsAt: z
      .string()
      .optional()
      .describe(
        'Start date and time of the event in Philippine Standard Time (PST, UTC+8). Accepts ISO string or YYYY-MM-DDTHH:mm:ss format.',
      ),
    endsAt: z
      .string()
      .optional()
      .describe('End date and time of the event in PST (UTC+8). Must be after startsAt.'),
    registrationOpensAt: z.string().optional().describe('When registration opens in PST (UTC+8).'),
    registrationClosesAt: z
      .string()
      .optional()
      .describe('When registration closes in PST (UTC+8). Must be after registrationOpensAt.'),
    publicRegistrationAccess: z
      .enum(['members', 'members_and_public', 'public'])
      .default('members')
      .describe(
        'Access audience: "members" (members only), "members_and_public" (both), or "public" (public open). Defaults to "members".',
      ),
    duplicatePolicy: z
      .enum(['block', 'allow_update', 'allow_multiple', 'allow_multiple_update'])
      .default('block')
      .describe(
        'How duplicate registrations from the same person are handled. Defaults to "block".',
      ),
    registrationMode: z
      .enum(['open', 'closed'])
      .default('open')
      .describe('Registration mode. Defaults to "open".'),
    allowNameLookup: z
      .boolean()
      .default(false)
      .describe('Whether member search by name is enabled in registration lookup.'),
    sendEmailAfterCompletion: z
      .boolean()
      .default(false)
      .describe('Whether a confirmation email is dispatched upon successful registration.'),
    fields: z
      .array(eventFieldSchema)
      .optional()
      .describe('Optional dynamic registration questions/fields to create for this event.'),
    force: z
      .boolean()
      .default(false)
      .describe(
        'Force creation even if an active event with the same title already exists in the database.',
      ),
  });

  return tool({
    description:
      'Create a new Welcome Center event in the database as a draft, with optional dynamic registration questions/fields. IMPORTANT: You MUST first present the proposed event details to the administrator in chat and receive their explicit confirmation before calling this tool. Returns the newly created event ID and administrative link.',
    parameters: schema,
    inputSchema: schema,
    execute: async ({
      title,
      slug,
      description,
      location,
      startsAt,
      endsAt,
      registrationOpensAt,
      registrationClosesAt,
      publicRegistrationAccess = 'members',
      duplicatePolicy = 'block',
      registrationMode = 'open',
      allowNameLookup = false,
      sendEmailAfterCompletion = false,
      fields,
      force = false,
    }) => {
      console.log('[chat:tool:createEvent] Executing', {
        title,
        slug,
        startsAt,
        endsAt,
        publicRegistrationAccess,
        fieldsCount: fields?.length ?? 0,
        force,
        requestId,
        userId,
      });

      // 1. Check if an active event with matching title already exists to prevent duplicate creations
      if (!force) {
        const { data: existingEvent } = await client
          .from('events')
          .select('id, title, slug, status, created_at')
          .ilike('title', title.trim())
          .neq('status', 'archived')
          .maybeSingle();

        if (existingEvent) {
          console.warn('[chat:tool:createEvent] Event with matching title already exists:', {
            existingId: existingEvent.id,
            title: existingEvent.title,
            status: existingEvent.status,
            requestId,
          });

          return {
            success: true,
            already_exists: true,
            event_id: existingEvent.id,
            title: existingEvent.title,
            slug: existingEvent.slug,
            status: existingEvent.status,
            admin_url: `/admin/events/${existingEvent.id}`,
            public_url: `/events/${existingEvent.slug}/register`,
            fields_created_count: 0,
            message: `An event titled "${existingEvent.title}" already exists in the database (${existingEvent.status}). Admin edit link: /admin/events/${existingEvent.id}`,
          };
        }
      }

      let createdByAdminId: string | null = null;
      if (userId) {
        const { data: adminRow } = await client
          .from('admins')
          .select('id')
          .eq('auth_user_id', userId)
          .maybeSingle();
        createdByAdminId = adminRow?.id ?? null;
      }

      let finalSlug = slug ? generateSlug(slug) : generateSlug(title);
      if (!finalSlug) {
        finalSlug = `event-${Date.now().toString(36)}`;
      }

      const { data: existingSlug } = await client
        .from('events')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      if (existingSlug) {
        const randomSuffix = crypto.randomUUID().split('-')[0].substring(0, 4);
        finalSlug = `${finalSlug}-${randomSuffix}`;
      }

      const eventId = crypto.randomUUID();
      const publicFlags = mapPublicRegistrationAccess(publicRegistrationAccess);

      const startsAtISO = toUTC8ISO(startsAt);
      const endsAtISO = toUTC8ISO(endsAt);
      const registrationOpensAtISO = toUTC8ISO(registrationOpensAt);
      const registrationClosesAtISO = toUTC8ISO(registrationClosesAt);

      const { error: eventError } = await client.from('events').insert({
        id: eventId,
        slug: finalSlug,
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        starts_at: startsAtISO,
        ends_at: endsAtISO,
        registration_opens_at: registrationOpensAtISO,
        registration_closes_at: registrationClosesAtISO,
        status: 'draft',
        duplicate_policy: duplicatePolicy,
        registration_mode: registrationMode,
        allow_public_registrations: publicFlags.allow_public_registrations,
        require_id_lookup: publicFlags.require_id_lookup,
        metadata: {
          allow_name_lookup: allowNameLookup ?? false,
          public_registration_access: publicRegistrationAccess,
          send_email_after_completion: sendEmailAfterCompletion ?? false,
        },
        created_by_admin_id: createdByAdminId,
      });

      if (eventError) {
        console.error('[chat:tool:createEvent] Error inserting event:', eventError);
        return { success: false, error: eventError.message };
      }

      let createdFieldsCount = 0;
      if (fields && fields.length > 0) {
        const eventFieldsToInsert = fields.map((f, index) => ({
          id: crypto.randomUUID(),
          event_id: eventId,
          field_key: f.field_key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_'),
          label: f.label.trim(),
          field_type: f.field_type,
          is_required: f.is_required ?? false,
          is_active: true,
          applicability: f.applicability ?? 'both',
          placeholder: f.placeholder?.trim() || null,
          help_text: f.help_text?.trim() || null,
          options: f.options ?? [],
          validation_rules: f.validation_rules ?? {},
          display_order: index + 1,
        }));

        const { error: fieldsError } = await client
          .from('event_fields')
          .insert(eventFieldsToInsert);

        if (fieldsError) {
          console.error('[chat:tool:createEvent] Error inserting event fields:', fieldsError);
        } else {
          createdFieldsCount = eventFieldsToInsert.length;
        }
      }

      console.log('[chat:tool:createEvent] Successfully created event', {
        eventId,
        slug: finalSlug,
        fieldsCreated: createdFieldsCount,
        requestId,
      });

      return {
        success: true,
        already_exists: false,
        event_id: eventId,
        title: title.trim(),
        slug: finalSlug,
        status: 'draft',
        admin_url: `/admin/events/${eventId}`,
        public_url: `/events/${finalSlug}/register`,
        fields_created_count: createdFieldsCount,
        message: `Event "${title.trim()}" has been successfully created as a draft. Admin edit link: /admin/events/${eventId}`,
      };
    },
  });
}
