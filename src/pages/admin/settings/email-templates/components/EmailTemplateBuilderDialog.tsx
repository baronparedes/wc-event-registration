import { useEffect, useState } from 'react';

import { Button, Dialog, FormInputField, FormTextareaField } from '@/components/ui';
import { supabase } from '@/lib/infrastructure/supabase';

import { useEmailTemplateMutation } from '../hooks/useEmailTemplateMutation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  templateId: string | null;
  onSuccess: () => void;
};

export function EmailTemplateBuilderDialog({ isOpen, onClose, templateId, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [resendId, setResendId] = useState('');
  const [variables, setVariables] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const mutation = useEmailTemplateMutation();

  useEffect(() => {
    if (isOpen && templateId) {
      setTimeout(() => setIsLoading(true), 0);
      supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setName(data.name);
            setSlug(data.slug);
            setResendId(data.resend_template_id);
            setVariables((data.required_variables || []).join(', '));
          }
          setIsLoading(false);
        });
    } else if (isOpen && !templateId) {
      setTimeout(() => {
        setName('');
        setSlug('');
        setResendId('');
        setVariables('');
      }, 0);
    }
  }, [isOpen, templateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredVariables = variables
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    await mutation.mutateAsync({
      id: templateId || undefined,
      name,
      slug,
      resend_template_id: resendId,
      required_variables: requiredVariables,
    });

    onSuccess();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <Dialog.Header showCloseButton>
        <Dialog.Title>{templateId ? 'Edit Template Mapping' : 'New Template Mapping'}</Dialog.Title>
        <Dialog.Description>Map a system event slug to a Resend Template ID.</Dialog.Description>
      </Dialog.Header>

      <form onSubmit={handleSubmit}>
        <Dialog.Body className="space-y-4">
          {isLoading ? (
            <div className="py-4 text-center text-muted">Loading...</div>
          ) : (
            <>
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

              <Dialog.Footer>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving...' : 'Save Template'}
                </Button>
              </Dialog.Footer>
            </>
          )}
        </Dialog.Body>
      </form>
    </Dialog>
  );
}
