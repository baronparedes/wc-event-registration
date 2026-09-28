import { useState } from 'react';

import { Plus } from 'lucide-react';

import {
  Button,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
  SectionCard,
} from '@/components/ui';

import { EmailTemplateBuilderDialog } from './components/EmailTemplateBuilderDialog';
import { useEmailTemplatesQuery } from './hooks/useEmailTemplatesQuery';

export function EmailTemplatesPage() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { data: templates = [], isLoading, refetch } = useEmailTemplatesQuery();

  const handleCreateNew = () => {
    setSelectedTemplateId(null);
    setIsBuilderOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedTemplateId(id);
    setIsBuilderOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Email Templates</h1>
            <p className="text-muted mt-1">
              Manage mapping to Resend templates for system notifications.
            </p>
          </div>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template Mapping
          </Button>
        </div>

        <SectionCard>
          <ListTable>
            <ListTableHead>
              <ListTableHeaderRow>
                <ListTableHeaderCell>Name</ListTableHeaderCell>
                <ListTableHeaderCell>Slug</ListTableHeaderCell>
                <ListTableHeaderCell>Resend Template ID</ListTableHeaderCell>
                <ListTableHeaderCell>Required Variables</ListTableHeaderCell>
                <ListTableHeaderCell>Actions</ListTableHeaderCell>
              </ListTableHeaderRow>
            </ListTableHead>
            <ListTableBody>
              {isLoading ? (
                <ListTableRow>
                  <ListTableCell colSpan={5} className="py-8 text-center text-muted">
                    Loading templates...
                  </ListTableCell>
                </ListTableRow>
              ) : templates.length === 0 ? (
                <ListTableRow>
                  <ListTableCell colSpan={5} className="py-8 text-center text-muted">
                    No email templates found. Create one to get started.
                  </ListTableCell>
                </ListTableRow>
              ) : (
                templates.map((template) => (
                  <ListTableRow key={template.id}>
                    <ListTableCell>
                      <div className="font-medium text-text">{template.name}</div>
                    </ListTableCell>
                    <ListTableCell>
                      <code className="rounded bg-surface px-2 py-1 text-xs font-mono text-muted">
                        {template.slug}
                      </code>
                    </ListTableCell>
                    <ListTableCell>{template.resend_template_id}</ListTableCell>
                    <ListTableCell>
                      {!template.required_variables || template.required_variables.length === 0 ? (
                        <span className="text-sm text-muted">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {template.required_variables.map((v: string) => (
                            <span
                              key={v}
                              className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-text"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </ListTableCell>
                    <ListTableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(template.id)}>
                        Edit
                      </Button>
                    </ListTableCell>
                  </ListTableRow>
                ))
              )}
            </ListTableBody>
          </ListTable>
        </SectionCard>
      </div>

      <EmailTemplateBuilderDialog
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        templateId={selectedTemplateId}
        onSuccess={() => {
          setIsBuilderOpen(false);
          refetch();
        }}
      />
    </>
  );
}
