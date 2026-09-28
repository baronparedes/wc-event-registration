import { useMemo, useState } from 'react';

import { Edit2, Mail, Plus, Search } from 'lucide-react';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  AlertBanner,
  Badge,
  Button,
  EmptyState,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
  SearchInputField,
} from '@/components/ui';
import { ActionButton } from '@/components/ui/ActionLink';
import { ROUTE_PATHS } from '@/config/constants';
import { useEmailTemplatesQuery } from '@/hooks/domain/email-templates';
import { useDebounceSearch, useIsMobileViewport } from '@/hooks/utils';

import { EmailTemplateBuilderDialog, MobileEmailTemplateCard } from './components';

export function EmailTemplatesPage() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { searchTerm, setSearchTerm, normalizedSearchTerm, clearSearch } = useDebounceSearch();
  const isMobileViewport = useIsMobileViewport();

  const { data: templates = [], isLoading, error, refetch } = useEmailTemplatesQuery();

  const filteredTemplates = useMemo(() => {
    if (!normalizedSearchTerm) return templates;
    return templates.filter((template) => {
      const nameMatch = template.name.toLowerCase().includes(normalizedSearchTerm);
      const slugMatch = template.slug.toLowerCase().includes(normalizedSearchTerm);
      const resendMatch = template.resend_template_id.toLowerCase().includes(normalizedSearchTerm);
      const variableMatch = template.required_variables?.some((v) =>
        v.toLowerCase().includes(normalizedSearchTerm),
      );
      return nameMatch || slugMatch || resendMatch || variableMatch;
    });
  }, [templates, normalizedSearchTerm]);

  const handleCreateNew = () => {
    setSelectedTemplateId(null);
    setIsBuilderOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedTemplateId(id);
    setIsBuilderOpen(true);
  };

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        title="Email Templates"
        description="Manage mapping between system notification slugs and Resend email templates."
        breadcrumbs={[
          { label: 'Settings', to: ROUTE_PATHS.adminSettings },
          { label: 'Email Templates' },
        ]}
        actions={
          <Button
            size="md"
            variant="default"
            onClick={handleCreateNew}
            className="w-full sm:w-auto sm:inline-flex"
          >
            <Plus className="h-5 w-5" />
            New Template Mapping
          </Button>
        }
      />

      <AdminBaseNavigation />

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <SearchInputField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onClear={clearSearch}
            placeholder="Search by template name, slug, Resend ID, or variable..."
          />
          <Button
            type="button"
            variant="primaryOutline"
            onClick={clearSearch}
            disabled={normalizedSearchTerm.length === 0}
          >
            Clear
          </Button>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading email templates...">
        {error ? (
          <AlertBanner
            variant="error"
            description={`Failed to load email templates: ${error.message}`}
          />
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Mail className="h-8 w-8" />}
              title="No email templates yet"
              description="Create your first email template mapping to connect system event slugs to Resend templates."
              action={
                <Button size="md" variant="default" onClick={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template Mapping
                </Button>
              }
            />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Search className="h-8 w-8 text-muted" />}
              title="No matching templates"
              description={`No email templates match "${searchTerm}". Try adjusting your search keywords.`}
              action={
                <Button variant="primaryOutline" onClick={clearSearch}>
                  Clear Search
                </Button>
              }
            />
          </div>
        ) : (
          <div className={isMobileViewport ? '' : 'rounded-2xl border border-border bg-surface'}>
            {isMobileViewport ? (
              <div className="space-y-3 pb-3">
                {filteredTemplates.map((template) => (
                  <MobileEmailTemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => handleEdit(template.id)}
                  />
                ))}
              </div>
            ) : (
              <ListTable>
                <ListTableHead>
                  <ListTableHeaderRow>
                    <ListTableHeaderCell>Template Name</ListTableHeaderCell>
                    <ListTableHeaderCell>System Slug</ListTableHeaderCell>
                    <ListTableHeaderCell>Resend Template ID</ListTableHeaderCell>
                    <ListTableHeaderCell>Required Variables</ListTableHeaderCell>
                    <ListTableHeaderCell className="text-right">Actions</ListTableHeaderCell>
                  </ListTableHeaderRow>
                </ListTableHead>
                <ListTableBody>
                  {filteredTemplates.map((template) => (
                    <ListTableRow key={template.id}>
                      <ListTableCell>
                        <span className="font-semibold text-text">{template.name}</span>
                      </ListTableCell>
                      <ListTableCell>
                        <code className="rounded bg-surface px-2 py-1 text-xs font-mono text-text border border-border">
                          {template.slug}
                        </code>
                      </ListTableCell>
                      <ListTableCell>
                        <code className="text-xs font-mono text-muted">
                          {template.resend_template_id}
                        </code>
                      </ListTableCell>
                      <ListTableCell>
                        {!template.required_variables ||
                        template.required_variables.length === 0 ? (
                          <span className="text-xs text-muted">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {template.required_variables.map((variable: string) => (
                              <Badge
                                key={variable}
                                variant="outline"
                                className="text-[11px] font-mono py-0.5 px-2"
                              >
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </ListTableCell>
                      <ListTableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <ActionButton
                            type="button"
                            aria-label={`Edit ${template.name}`}
                            title="Edit template mapping"
                            onClick={() => handleEdit(template.id)}
                          >
                            <Edit2 className="h-5 w-5" aria-hidden="true" />
                          </ActionButton>
                        </div>
                      </ListTableCell>
                    </ListTableRow>
                  ))}
                </ListTableBody>
              </ListTable>
            )}
          </div>
        )}
      </AdminPageShell.Content>

      <EmailTemplateBuilderDialog
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        templateId={selectedTemplateId}
        onSuccess={() => {
          setIsBuilderOpen(false);
          refetch();
        }}
      />
    </AdminPageShell>
  );
}
