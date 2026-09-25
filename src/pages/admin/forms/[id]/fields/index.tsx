import { useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { AlertBanner, Button } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminFormQuery, useFormFieldsQuery } from '@/hooks/domain/forms';
import type { FormField } from '@/lib/domain/forms';
import { FormNavigationLinks } from '@/pages/admin/forms/components';

import { FormFieldEditPanel, FormFieldsList } from './components';

type PanelState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; field: FormField };

export function AdminFormFieldsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading: formLoading } = useAdminFormQuery(id);
  const { data: fields, isLoading: fieldsLoading } = useFormFieldsQuery(id, true);
  const [panelState, setPanelState] = useState<PanelState>({ mode: 'closed' });

  const isLoading = formLoading || fieldsLoading;
  const isDraft = form?.status === 'draft';
  const isPublished = form?.status === 'published';
  const panelField: FormField | null = panelState.mode === 'edit' ? panelState.field : null;

  function openCreate() {
    setPanelState({ mode: 'create' });
  }

  function openEdit(field: FormField) {
    setPanelState({ mode: 'edit', field });
  }

  function closePanel() {
    setPanelState({ mode: 'closed' });
  }

  const navLinks = id ? <FormNavigationLinks formId={id} currentSection="fields" /> : undefined;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Forms', to: ROUTE_PATHS.adminForms },
          {
            label: form?.title ?? 'Form',
            to: id ? toRoute('adminFormDetail', { id }) : undefined,
          },
          { label: 'Form Fields' },
        ]}
        navLinks={navLinks}
        title="Manage Form Fields"
        description={form ? `Manage the form fields for ${form.title}` : 'Manage form fields'}
        actions={
          <Button
            type="button"
            variant="default"
            onClick={openCreate}
            disabled={!isDraft}
            title={!isDraft ? 'Only draft forms can add new fields.' : undefined}
          >
            Add Field
          </Button>
        }
      />

      {!isDraft && form && (
        <AlertBanner
          variant="info"
          title={isPublished ? 'Published form' : 'Archived form'}
          description={
            isPublished
              ? 'You can edit labels, audience, and display text. To change field types or options, archive this form and create a new one.'
              : 'Field edits are disabled on archived forms.'
          }
        />
      )}

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading fields...">
        {!form ? (
          <AlertBanner
            variant="error"
            description={
              <>
                Form not found.{' '}
                <Link className="underline" to={ROUTE_PATHS.adminForms}>
                  Back to forms
                </Link>
              </>
            }
          />
        ) : (
          <>
            <FormFieldsList
              fields={fields ?? []}
              formId={id ?? ''}
              formStatus={form.status}
              onEdit={openEdit}
            />

            {panelState.mode !== 'closed' && id && (
              <FormFieldEditPanel
                formId={id}
                formStatus={form.status}
                field={panelField}
                onClose={closePanel}
              />
            )}
          </>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
