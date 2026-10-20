import { tool } from 'ai';
import { z } from 'chat-zod';

import type { Database } from '@/shared/database.types.ts';

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
    .describe('Field key e.g. "tshirt_size" (lowercase alphanumeric & underscores).'),
  label: z.string().describe('Question label displayed to registrants.'),
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
      'rating',
    ])
    .default('text'),
  is_required: z.boolean().default(false),
  applicability: z.enum(['members', 'guests', 'both']).default('both'),
  placeholder: z.string().optional(),
  help_text: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  validation_rules: z.record(z.string(), z.unknown()).optional(),
});

export function createCreateEventTool({ client, requestId, userId }: ToolContext) {
  const schema = z.object({
    title: z.string().min(1).max(200).describe('Title of the event (1-200 characters).'),
    slug: z.string().optional().describe('URL-safe slug. Auto-generated from title if omitted.'),
    description: z.string().optional(),
    location: z.string().optional(),
    startsAt: z
      .string()
      .optional()
      .describe('Start date/time in PST UTC+8 (ISO or YYYY-MM-DDTHH:mm).'),
    endsAt: z.string().optional().describe('End date/time in PST UTC+8 (after startsAt).'),
    registrationOpensAt: z.string().optional(),
    registrationClosesAt: z.string().optional(),
    publicRegistrationAccess: z
      .enum(['members', 'members_and_public', 'public'])
      .default('members'),
    duplicatePolicy: z
      .enum(['block', 'allow_update', 'allow_multiple', 'allow_multiple_update'])
      .default('block'),
    registrationMode: z.enum(['open', 'closed']).default('open'),
    allowNameLookup: z.boolean().default(false),
    sendEmailAfterCompletion: z.boolean().default(false),
    fields: z.array(eventFieldSchema).optional().describe('Optional registration fields.'),
    force: z
      .boolean()
      .default(false)
      .describe('Force creation even if active event with same title exists.'),
  });

  return tool({
    description:
      'Create a new Welcome Center event in the database as a draft, with optional dynamic registration questions/fields. IMPORTANT: You MUST first present the proposed event details to the administrator in chat and receive their explicit confirmation before calling this tool. Returns the newly created event ID and administrative link.',
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
          .insert(
            eventFieldsToInsert as unknown as Database['public']['Tables']['event_fields']['Insert'][],
          );

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
