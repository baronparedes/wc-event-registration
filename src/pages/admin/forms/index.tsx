import { useMemo, useState } from 'react';

import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  AdminInfiniteScrollFooter,
  AlertBanner,
  Button,
  EmptyState,
  SearchInputField,
} from '@/components/ui';
import { PAGINATION_DEFAULTS, ROUTE_PATHS, UI_MESSAGES, toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminFormsQuery, useDuplicateFormMutation } from '@/hooks/domain/forms';
import { useDebounceSearch, useInfiniteScrollTrigger, useIsMobileViewport } from '@/hooks/utils';
import { canAdminPerform } from '@/lib/domain/auth';
import type { AdminForm } from '@/lib/domain/forms';

import { AdminFormsTable, DuplicateFormDialog, MobileFormCard } from './components';

export function AdminFormsPage() {
  const navigate = useNavigate();
  const { data: authState } = useAdminAuthQuery();
  const { searchTerm, setSearchTerm, normalizedSearchTerm, clearSearch } = useDebounceSearch();

  const formsQuery = useAdminFormsQuery({
    pageSize: PAGINATION_DEFAULTS.adminEventsPageSize,
    searchTerm: normalizedSearchTerm,
  });

  const pages = formsQuery.data?.pages;
  const forms = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const totalCount = pages?.[0]?.totalCount ?? 0;
  const hasNextPage = Boolean(formsQuery.hasNextPage);
  const isFetchingNextPage = Boolean(formsQuery.isFetchingNextPage);
  const fetchNextPage = formsQuery.fetchNextPage;

  const isLoading = formsQuery.isLoading;
  const error = formsQuery.error;
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const canRead = canAdminPerform(authState?.adminRole, 'canReadAdminData');
  const isMobileViewport = useIsMobileViewport();

  const { sentinelRef } = useInfiniteScrollTrigger({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const [duplicateForm, setDuplicateForm] = useState<AdminForm | null>(null);
  const duplicateMutation = useDuplicateFormMutation();

  const handleDuplicateForm = async (sourceFormId: string, newTitle: string, newSlug: string) => {
    try {
      const newFormId = await duplicateMutation.mutateAsync({
        source_form_id: sourceFormId,
        new_title: newTitle,
        new_slug: newSlug,
      });
      toast.success('Form duplicated successfully');
      setDuplicateForm(null);
      navigate(toRoute('adminFormDetail', { id: newFormId }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate form');
    }
  };

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Forms' }]}
        title="Manage Forms"
        description="Create, edit, configure dynamic fields, and manage custom form submissions."
        actions={
          canWrite ? (
            <Button
              size="md"
              variant="default"
              onClick={() => navigate(ROUTE_PATHS.adminFormNew)}
              className="w-full sm:w-auto sm:inline-flex"
            >
              <Plus className="h-5 w-5" />
              New Form
            </Button>
          ) : undefined
        }
      />

      <AdminBaseNavigation />

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <SearchInputField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onClear={clearSearch}
            placeholder="Search by form title or slug"
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

      <AdminPageShell.Content isLoading={isLoading} loadingMessage={UI_MESSAGES.loading.events}>
        {error && <AlertBanner variant="error" description="Failed to load forms." />}

        {!error && forms.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Plus className="h-6 w-6" />}
              title="No forms yet"
              description={
                canWrite
                  ? 'Create your first custom form to get started with data gathering.'
                  : 'Forms will appear here once an admin creates them.'
              }
              action={
                canWrite ? (
                  <Button asChild size="md" variant="default">
                    <Link to={ROUTE_PATHS.adminFormNew}>Create Form</Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {!error && forms.length > 0 && (
          <div className={isMobileViewport ? '' : 'rounded-2xl border border-border bg-surface'}>
            {isMobileViewport ? (
              <div className="space-y-3 pb-3">
                {forms.map((form) => (
                  <MobileFormCard
                    key={form.id}
                    form={form}
                    canWrite={canWrite}
                    canRead={canRead}
                    onDuplicateClick={setDuplicateForm}
                  />
                ))}
              </div>
            ) : (
              <AdminFormsTable
                forms={forms}
                canWrite={canWrite}
                canRead={canRead}
                onFormSelect={(formId) => navigate(toRoute('adminFormDetail', { id: formId }))}
                onDuplicateClick={setDuplicateForm}
              />
            )}

            <DuplicateFormDialog
              isOpen={Boolean(duplicateForm)}
              onClose={() => setDuplicateForm(null)}
              form={duplicateForm}
              isPending={duplicateMutation.isPending}
              onDuplicate={handleDuplicateForm}
            />

            <AdminInfiniteScrollFooter
              currentCount={forms.length}
              totalCount={totalCount}
              entityName="form"
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onFetchNextPage={() => fetchNextPage()}
              sentinelRef={sentinelRef}
            />
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
