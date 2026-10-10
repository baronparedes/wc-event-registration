import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import {
  Badge,
  Button,
  Dialog,
  FormInputField,
  FormTextareaField,
  LoadingState,
  Spinner,
} from '@/components/ui';
import { useEmailTemplateMutation, useEmailTemplateQuery } from '@/hooks/domain/email-templates';
import type { EmailTemplate } from '@/lib/domain/email-templates';

const emailTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be 100 characters or less'),
  slug: z
    .string()
    .trim()
    .min(1, 'System slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(
      /^[a-z0-9_-]+$/,
      'Slug must contain only lowercase letters, numbers, hyphens, and underscores',
    ),
  resend_template_id: z
    .string()
    .trim()
    .min(1, 'Resend template ID is required')
    .max(255, 'Resend template ID is too long'),
  required_variables_raw: z.string().optional(),
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

type EmailTemplateBuilderDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  templateId: string | null;
  onSuccess: () => void;
};

type FormProps = {
  template?: EmailTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseVariables(rawText?: string): string[] {
  if (!rawText) return [];
  return rawText
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function EmailTemplateBuilderForm({ template, onClose, onSuccess }: FormProps) {
  const isEditMode = Boolean(template?.id);
  const mutation = useEmailTemplateMutation();

  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: template?.name ?? '',
      slug: template?.slug ?? '',
      resend_template_id: template?.resend_template_id ?? '',
      required_variables_raw: (template?.required_variables || []).join(', '),
    },
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = form;

  const rawVariables = useWatch({ control, name: 'required_variables_raw' });
  const parsedVariables = parseVariables(rawVariables);

  // Auto-slugify when creating if user hasn't manually edited the slug field
  const nameValue = useWatch({ control, name: 'name' });
  useEffect(() => {
    if (!isEditMode && !dirtyFields.slug && nameValue) {
      setValue('slug', slugify(nameValue), { shouldValidate: true });
    }
  }, [nameValue, isEditMode, dirtyFields.slug, setValue]);

  const onSubmit = async (values: EmailTemplateFormValues) => {
    const requiredVariables = parseVariables(values.required_variables_raw);

    await mutation
      .mutateAsync({
        id: template?.id,
        name: values.name,
        slug: values.slug,
        resend_template_id: values.resend_template_id,
        required_variables: requiredVariables,
      })
      .catch(() => undefined);

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Dialog.Body className="space-y-4">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <FormInputField
              id="template-name"
              label="Template Name"
              placeholder="e.g. Welcome Email"
              error={errors.name?.message}
              required
              {...field}
              value={field.value ?? ''}
            />
          )}
        />

        <Controller
          control={control}
          name="slug"
          render={({ field }) => (
            <FormInputField
              id="template-slug"
              label="System Slug"
              placeholder="e.g. welcome_email"
              error={errors.slug?.message}
              helperText={
                isEditMode
                  ? 'Slug cannot be changed after creation to preserve existing system triggers.'
                  : 'Used by the system code to identify and trigger this template.'
              }
              inputClassName={`font-mono ${
                isEditMode ? 'cursor-not-allowed bg-background/50 text-muted' : ''
              }`}
              labelAdornment={
                isEditMode && (
                  <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-xs font-normal text-muted ring-1 ring-border">
                    locked
                  </span>
                )
              }
              readOnly={isEditMode}
              required
              {...field}
              value={field.value ?? ''}
              onChange={(e) => {
                if (!isEditMode) {
                  field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                }
              }}
            />
          )}
        />

        <Controller
          control={control}
          name="resend_template_id"
          render={({ field }) => (
            <FormInputField
              id="resend-template-id"
              label="Resend Template ID"
              placeholder="e.g. d-1234567890abcdef"
              error={errors.resend_template_id?.message}
              helperText="The template ID configured inside your Resend dashboard."
              inputClassName="font-mono"
              required
              {...field}
              value={field.value ?? ''}
            />
          )}
        />

        <div className="space-y-2">
          <Controller
            control={control}
            name="required_variables_raw"
            render={({ field }) => (
              <FormTextareaField
                id="required-variables"
                label="Required Variables (comma separated)"
                placeholder="first_name, event_date, invite_link"
                error={errors.required_variables_raw?.message}
                helperText="Dynamic variable keys passed to the Resend template."
                rows={2}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          {parsedVariables.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-50 p-2.5 space-y-1.5">
              <span className="text-xs font-medium text-muted">Parsed Variables Preview:</span>
              <div className="flex flex-wrap gap-1">
                {parsedVariables.map((variable) => (
                  <Badge key={variable} variant="outline" className="text-[11px] font-mono">
                    {variable}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button
          type="button"
          variant="primaryOutline"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          disabled={isSubmitting || mutation.isPending || (isEditMode && !isDirty)}
        >
          {mutation.isPending && <Spinner size="sm" className="mr-2" aria-hidden="true" />}
          {mutation.isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Template'}
        </Button>
      </Dialog.Footer>
    </form>
  );
}

export function EmailTemplateBuilderDialog({
  isOpen,
  onClose,
  templateId,
  onSuccess,
}: EmailTemplateBuilderDialogProps) {
  const { data: template, isLoading } = useEmailTemplateQuery(isOpen ? templateId : null);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton>
        <Dialog.Title>{templateId ? 'Edit Template Mapping' : 'New Template Mapping'}</Dialog.Title>
        <Dialog.Description>
          Map a system event slug to a Resend template ID with expected dynamic variables.
        </Dialog.Description>
      </Dialog.Header>

      {templateId && isLoading ? (
        <Dialog.Body className="flex h-48 items-center justify-center">
          <LoadingState layout="horizontal" message="Loading template details..." />
        </Dialog.Body>
      ) : (
        <EmailTemplateBuilderForm
          key={templateId ? (template?.id ?? 'loading') : 'new'}
          template={template}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}
