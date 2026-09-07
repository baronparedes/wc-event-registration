import { useState } from 'react';

import { Plus, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Button, FormInputField, FormSelectField } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import {
  useAdminFormQuery,
  useDeleteFormFieldMutation,
  useFormFieldsQuery,
  useSaveFormFieldMutation,
} from '@/hooks/domain/forms';
import type { FormField, FormFieldInput } from '@/lib/domain/forms';

export function AdminFormFieldsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading: formLoading } = useAdminFormQuery(id);
  const { data: fields, isLoading: fieldsLoading } = useFormFieldsQuery(id, true);

  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const saveFieldMutation = useSaveFormFieldMutation(id ?? '');
  const deleteFieldMutation = useDeleteFormFieldMutation(id ?? '');

  const isLoading = formLoading || fieldsLoading;

  const [fieldKey, setFieldKey] = useState('');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<FormFieldInput['field_type']>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [applicability, setApplicability] = useState<'all' | 'member_only' | 'public_only'>('all');
  const [rawOptions, setRawOptions] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);

  function startAdding() {
    setEditingField(null);
    setFieldKey('');
    setLabel('');
    setFieldType('text');
    setIsRequired(false);
    setApplicability('all');
    setRawOptions('');
    setDisplayOrder((fields?.length ?? 0) * 10);
    setIsAdding(true);
  }

  function startEditing(field: FormField) {
    setIsAdding(false);
    setEditingField(field);
    setFieldKey(field.field_key);
    setLabel(field.label);
    setFieldType(field.field_type as FormFieldInput['field_type']);
    setIsRequired(field.is_required);
    setApplicability(field.field_applicability);
    setRawOptions(
      Array.isArray(field.options) ? field.options.map((o) => o.label).join('\n') : '',
    );
    setDisplayOrder(field.display_order);
  }

  function cancelEditor() {
    setIsAdding(false);
    setEditingField(null);
  }

  async function handleSaveField() {
    if (!id || !label.trim() || !fieldKey.trim()) return;

    const parsedOptions = rawOptions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((opt) => ({ label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }));

    const inputData: FormFieldInput = {
      field_key: fieldKey.trim().toLowerCase().replace(/\s+/g, '_'),
      label: label.trim(),
      field_type: fieldType,
      is_required: isRequired,
      is_active: true,
      options: parsedOptions,
      validation_rules: {},
      field_applicability: applicability,
      display_order: displayOrder,
    };

    try {
      await saveFieldMutation.mutateAsync({
        id: editingField?.id,
        data: inputData,
      });
      cancelEditor();
    } catch (err) {
      console.error('Failed to save form field:', err);
    }
  }

  async function handleDeleteField(fieldId: string) {
    if (confirm('Are you sure you want to delete this field?')) {
      await deleteFieldMutation.mutateAsync(fieldId);
    }
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Forms', to: ROUTE_PATHS.adminForms },
          { label: form?.title ?? 'Form', to: id ? toRoute('adminFormDetail', { id }) : undefined },
          { label: 'Form Fields' },
        ]}
        title="Form Fields Builder"
        description={form ? `Configure fields for ${form.title}` : 'Manage form fields'}
        actions={
          <Button type="button" variant="default" onClick={startAdding}>
            <Plus className="h-4 w-4 mr-1 inline-block" /> Add Field
          </Button>
        }
      />

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading form fields...">
        {!form ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Form not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminForms}>
              Back to forms
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="text-lg font-semibold text-text mb-4">Configured Fields</h3>
                {fields?.length === 0 ? (
                  <p className="text-sm text-muted">No fields configured yet. Click &quot;Add Field&quot; to begin.</p>
                ) : (
                  <div className="space-y-3">
                    {fields?.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-background p-4 transition hover:border-accent"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text">{field.label}</span>
                            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent font-mono">
                              {field.field_key}
                            </span>
                            {field.is_required && (
                              <span className="text-xs text-red-500 font-medium">Required</span>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-1">
                            Type: <span className="capitalize">{field.field_type}</span> | Audience:{' '}
                            <span className="capitalize">{field.field_applicability}</span> | Order:{' '}
                            {field.display_order}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="primaryOutline" onClick={() => startEditing(field)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="primaryOutline" onClick={() => handleDeleteField(field.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(isAdding || editingField) && (
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 h-fit">
                <h3 className="text-lg font-semibold text-text">
                  {editingField ? 'Edit Field' : 'New Field'}
                </h3>

                <FormInputField
                  label="Field Label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Preferred Schedule Change Date"
                  required
                />

                <FormInputField
                  label="Field Key"
                  value={fieldKey}
                  onChange={(e) => setFieldKey(e.target.value)}
                  placeholder="e.g. schedule_change_date"
                  required
                />

                <FormSelectField
                  label="Field Type"
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as FormFieldInput['field_type'])}
                  options={[
                    { label: 'Short Text', value: 'text' },
                    { label: 'Long Text (Textarea)', value: 'textarea' },
                    { label: 'Number', value: 'number' },
                    { label: 'Dropdown Select', value: 'select' },
                    { label: 'Multi-Select', value: 'multi_select' },
                    { label: 'Radio', value: 'radio' },
                    { label: 'Checkbox Toggle', value: 'checkbox' },
                    { label: 'Date', value: 'date' },
                    { label: 'Email', value: 'email' },
                    { label: 'Phone', value: 'phone' },
                  ]}
                />

                {(fieldType === 'select' || fieldType === 'multi_select' || fieldType === 'radio') && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Options (One per line)
                    </label>
                    <textarea
                      rows={4}
                      value={rawOptions}
                      onChange={(e) => setRawOptions(e.target.value)}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                    />
                  </div>
                )}

                <FormSelectField
                  label="Field Applicability"
                  value={applicability}
                  onChange={(e) => setApplicability(e.target.value as 'all' | 'member_only' | 'public_only')}
                  options={[
                    { label: 'All Respondents', value: 'all' },
                    { label: 'Members Only', value: 'member_only' },
                    { label: 'Public Only', value: 'public_only' },
                  ]}
                />

                <FormInputField
                  label="Display Order"
                  type="number"
                  value={String(displayOrder)}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                />

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_required_cb"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <label htmlFor="is_required_cb" className="text-sm text-text font-medium">
                    Required Field
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleSaveField}
                    disabled={saveFieldMutation.isPending}
                  >
                    {saveFieldMutation.isPending ? 'Saving...' : 'Save Field'}
                  </Button>
                  <Button type="button" variant="primaryOutline" onClick={cancelEditor}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
