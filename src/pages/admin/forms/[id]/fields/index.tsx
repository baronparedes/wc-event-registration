import { useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Button } from '@/components/ui/Button';
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
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            {isPublished ? 'Published form' : 'Archived form'}
          </p>
          <p className="mt-1 text-xs text-blue-700">
            {isPublished
              ? 'You can edit labels, audience, and display text. To change field types or options, archive this form and create a new one.'
              : 'Field edits are disabled on archived forms.'}
          </p>
        </div>
      )}

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading fields...">
        {!form ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Form not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminForms}>
              Back to forms
            </Link>
          </div>
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
