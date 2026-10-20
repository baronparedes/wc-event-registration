import { tool } from 'ai';
import { z } from 'chat-zod';

import type { Database } from '@/shared/database.types.ts';

import type { ToolContext } from './types.ts';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const formFieldSchema = z.object({
  field_key: z
    .string()
    .describe(
      'Unique identifier for this field in the form (e.g. "feedback_comments", "rating"). Lowercase alphanumeric and underscores only.',
    ),
  label: z.string().describe('Human-readable question or label displayed to respondents.'),
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
  field_applicability: z.enum(['all', 'member_only', 'public_only']).default('all'),
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

export function createCreateFormTool({ client, requestId, userId }: ToolContext) {
  const schema = z.object({
    title: z.string().min(1).max(200).describe('Title of the form (1-200 characters).'),
    slug: z.string().optional().describe('URL-safe slug. Auto-generated from title if omitted.'),
    description: z.string().optional(),
    audience: z.enum(['members', 'public', 'members_and_public']).default('members'),
    duplicatePolicy: z
      .enum(['block', 'allow_update', 'allow_multiple', 'allow_multiple_update'])
      .default('block'),
    sendEmailAfterCompletion: z.boolean().default(false),
    fields: z.array(formFieldSchema).optional().describe('Optional dynamic form questions.'),
    force: z
      .boolean()
      .default(false)
      .describe('Force creation even if active form with same title exists.'),
  });

  return tool({
    description:
      'Create a new non-event form in the database as a draft, with optional dynamic questionnaire fields. IMPORTANT: You MUST first present the proposed form details to the administrator in chat and receive their explicit confirmation before calling this tool. Returns the newly created form ID and administrative link.',
    inputSchema: schema,
    execute: async ({
      title,
      slug,
      description,
      audience = 'members',
      duplicatePolicy = 'block',
      sendEmailAfterCompletion = false,
      fields,
      force = false,
    }) => {
      console.log('[chat:tool:createForm] Executing', {
        title,
        slug,
        audience,
        duplicatePolicy,
        fieldsCount: fields?.length ?? 0,
        force,
        requestId,
        userId,
      });

      // 1. Check if an active form with matching title already exists to prevent duplicate creations
      if (!force) {
        const { data: existingForm } = await client
          .from('forms')
          .select('id, title, slug, status, created_at')
          .ilike('title', title.trim())
          .neq('status', 'archived')
          .maybeSingle();

        if (existingForm) {
          console.warn('[chat:tool:createForm] Form with matching title already exists:', {
            existingId: existingForm.id,
            title: existingForm.title,
            status: existingForm.status,
            requestId,
          });

          return {
            success: true,
            already_exists: true,
            form_id: existingForm.id,
            title: existingForm.title,
            slug: existingForm.slug,
            status: existingForm.status,
            admin_url: `/admin/forms/${existingForm.id}`,
            public_url: `/forms/${existingForm.slug}`,
            fields_created_count: 0,
            message: `A form titled "${existingForm.title}" already exists in the database (${existingForm.status}). Admin edit link: /admin/forms/${existingForm.id}`,
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
        finalSlug = `form-${Date.now().toString(36)}`;
      }

      const { data: existingSlug } = await client
        .from('forms')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      if (existingSlug) {
        const randomSuffix = crypto.randomUUID().split('-')[0].substring(0, 4);
        finalSlug = `${finalSlug}-${randomSuffix}`;
      }

      const formId = crypto.randomUUID();

      const { error: formError } = await client.from('forms').insert({
        id: formId,
        slug: finalSlug,
        title: title.trim(),
        description: description?.trim() || null,
        status: 'draft',
        duplicate_policy: duplicatePolicy,
        audience,
        metadata: {
          send_email_after_completion: sendEmailAfterCompletion ?? false,
        },
        created_by_admin_id: createdByAdminId,
      });

      if (formError) {
        console.error('[chat:tool:createForm] Error inserting form:', formError);
        return { success: false, error: formError.message };
      }

      let createdFieldsCount = 0;
      if (fields && fields.length > 0) {
        const formFieldsToInsert = fields.map((f, index) => ({
          id: crypto.randomUUID(),
          form_id: formId,
          field_key: f.field_key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_'),
          label: f.label.trim(),
          field_type: f.field_type,
          is_required: f.is_required ?? false,
          is_active: true,
          field_applicability: f.field_applicability ?? 'all',
          placeholder: f.placeholder?.trim() || null,
          help_text: f.help_text?.trim() || null,
          options: f.options ?? [],
          validation_rules: f.validation_rules ?? {},
          display_order: index + 1,
        }));

        const { error: fieldsError } = await client
          .from('form_fields')
          .insert(
            formFieldsToInsert as unknown as Database['public']['Tables']['form_fields']['Insert'][],
          );

        if (fieldsError) {
          console.error('[chat:tool:createForm] Error inserting form fields:', fieldsError);
        } else {
          createdFieldsCount = formFieldsToInsert.length;
        }
      }

      console.log('[chat:tool:createForm] Successfully created form', {
        formId,
        slug: finalSlug,
        fieldsCreated: createdFieldsCount,
        requestId,
      });

      return {
        success: true,
        already_exists: false,
        form_id: formId,
        title: title.trim(),
        slug: finalSlug,
        status: 'draft',
        admin_url: `/admin/forms/${formId}`,
        public_url: `/forms/${finalSlug}`,
        fields_created_count: createdFieldsCount,
        message: `Form "${title.trim()}" has been successfully created as a draft. Admin edit link: /admin/forms/${formId}`,
      };
    },
  });
}
