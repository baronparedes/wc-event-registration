import { useState } from 'react';

import { Button, Dialog, FormInputField, FormTextareaField } from '@/components/ui';
import { useEmailTemplateMutation, useEmailTemplateQuery } from '@/hooks/domain/email-templates';
import type { EmailTemplate } from '@/lib/domain/email-templates';

type Props = {
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

function EmailTemplateBuilderForm({ template, onClose, onSuccess }: FormProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [slug, setSlug] = useState(template?.slug ?? '');
  const [resendId, setResendId] = useState(template?.resend_template_id ?? '');
  const [variables, setVariables] = useState((template?.required_variables || []).join(', '));

  const mutation = useEmailTemplateMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredVariables = variables
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    await mutation.mutateAsync({
      id: template?.id,
      name,
      slug,
      resend_template_id: resendId,
      required_variables: requiredVariables,
    });

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Dialog.Body className="space-y-4">
        <FormInputField
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Welcome Email"
          required
        />
        <FormInputField
          label="System Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. welcome_email"
          helperText="Used by the system to identify this template."
          required
        />
        <FormInputField
          label="Resend Template ID"
          value={resendId}
          onChange={(e) => setResendId(e.target.value)}
          placeholder="e.g. d-1234567890abcdef"
          required
        />
        <FormTextareaField
          label="Required Variables (comma separated)"
          value={variables}
          onChange={(e) => setVariables(e.target.value)}
          placeholder="first_name, event_date, invite_link"
          helperText="These will be passed as dynamic data to Resend."
        />
      </Dialog.Body>

      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="default" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Template'}
        </Button>
      </Dialog.Footer>
    </form>
  );
}

export function EmailTemplateBuilderDialog({ isOpen, onClose, templateId, onSuccess }: Props) {
  const { data: template, isLoading } = useEmailTemplateQuery(isOpen ? templateId : null);

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <Dialog.Header showCloseButton>
        <Dialog.Title>{templateId ? 'Edit Template Mapping' : 'New Template Mapping'}</Dialog.Title>
        <Dialog.Description>Map a system event slug to a Resend Template ID.</Dialog.Description>
      </Dialog.Header>

      {templateId && isLoading ? (
        <Dialog.Body className="py-8 text-center text-muted">Loading...</Dialog.Body>
      ) : (
        <EmailTemplateBuilderForm
          key={templateId ?? 'new'}
          template={template}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}
