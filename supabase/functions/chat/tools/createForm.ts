import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

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
    ])
    .default('text')
    .describe('Type of input field.'),
  is_required: z.boolean().default(false).describe('Whether answering this field is mandatory.'),
  field_applicability: z
    .enum(['all', 'member_only', 'public_only'])
    .default('all')
    .describe(
      'Audience scope: "all" (both members and public), "member_only" (signed-in members only), or "public_only" (anonymous public only).',
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
      'Optional validation rules, e.g. visibility_rule: { depends_on_field_key, equals_value }, min_length, max_length.',
    ),
});

export function createCreateFormTool({ client, requestId, userId }: ToolContext) {
  const schema = z.object({
    title: z.string().min(1).max(200).describe('Title of the form (1-200 characters).'),
    slug: z
      .string()
      .optional()
      .describe(
        'URL-safe slug for the form (e.g. "volunteer-survey-2026"). If omitted, it will be automatically generated from the title.',
      ),
    description: z
      .string()
      .optional()
      .describe('Detailed description or instructions displayed on the form.'),
    audience: z
      .enum(['members', 'public', 'members_and_public'])
      .default('members')
      .describe(
        'Allowed respondent audience: "members" (church members only), "public" (open to public), or "members_and_public" (both). Defaults to "members".',
      ),
    duplicatePolicy: z
      .enum(['block', 'allow_update', 'allow_multiple', 'allow_multiple_update'])
      .default('block')
      .describe(
        'How duplicate submissions from the same respondent are handled. Defaults to "block".',
      ),
    sendEmailAfterCompletion: z
      .boolean()
      .default(false)
      .describe('Whether a confirmation email is dispatched upon successful form submission.'),
    fields: z
      .array(formFieldSchema)
      .optional()
      .describe('Optional dynamic form questions/fields to create for this form.'),
    force: z
      .boolean()
      .default(false)
      .describe(
        'Force creation even if an active form with the same title already exists in the database.',
      ),
  });

  return tool({
    description:
      'Create a new non-event form in the database as a draft, with optional dynamic questionnaire fields. IMPORTANT: You MUST first present the proposed form details to the administrator in chat and receive their explicit confirmation before calling this tool. Returns the newly created form ID and administrative link.',
    parameters: schema,
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
        const randomSuffix = Math.random().toString(36).substring(2, 6);
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

        const { error: fieldsError } = await client.from('form_fields').insert(formFieldsToInsert);

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
