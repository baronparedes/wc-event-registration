import { useEffect, useMemo, useRef, useState } from 'react';

import { ClipboardList, FormInput, Loader2, Plus, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AdminPageShell, AdminSubNavLink } from '@/components/layout';
import { ActionLink, Button, EmptyState, FormInputField } from '@/components/ui';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { PAGINATION_DEFAULTS, ROUTE_PATHS, TIMING, UI_MESSAGES, toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminFormsQuery } from '@/hooks/domain/forms';
import { canAdminPerform } from '@/lib/domain/auth';
import { formatDateOnly } from '@/lib/infrastructure';

export function AdminFormsPage() {
  const navigate = useNavigate();
  const { data: authState } = useAdminAuthQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const normalizedSearchTerm = useMemo(() => debouncedSearchTerm.trim(), [debouncedSearchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, TIMING.searchDebounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

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

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    const currentElement = loadMoreRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

      <AdminPageShell.SubNav>
        <AdminSubNavLink to={ROUTE_PATHS.adminEvents}>Events</AdminSubNavLink>
        <AdminSubNavLink to={ROUTE_PATHS.adminForms}>Forms</AdminSubNavLink>
        {(canWrite || canRead) && (
          <AdminSubNavLink to={ROUTE_PATHS.adminMembers}>Members</AdminSubNavLink>
        )}
      </AdminPageShell.SubNav>

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <FormInputField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by form title or slug"
            inputClassName="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <Button
            type="button"
            variant="primaryOutline"
            onClick={() => setSearchTerm('')}
            disabled={normalizedSearchTerm.length === 0}
          >
            Clear
          </Button>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage={UI_MESSAGES.loading.events}>
        {error && (
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-red-600">Failed to load forms.</p>
          </div>
        )}

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
          <div className="rounded-2xl border border-border bg-surface">
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell className="px-6">Form Title</ListTableHeaderCell>
                  <ListTableHeaderCell>Audience</ListTableHeaderCell>
                  <ListTableHeaderCell>Duplicate Policy</ListTableHeaderCell>
                  <ListTableHeaderCell>Status</ListTableHeaderCell>
                  <ListTableHeaderCell>Created</ListTableHeaderCell>
                  <ListTableHeaderCell>Actions</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>
                {forms.map((form) => (
                  <ListTableRow
                    key={form.id}
                    className={canWrite ? 'cursor-pointer' : undefined}
                    onClick={
                      canWrite
                        ? () => navigate(toRoute('adminFormDetail', { id: form.id }))
                        : undefined
                    }
                  >
                    <ListTableCell className="px-6">
                      <p className="font-medium text-text">{form.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{form.slug}</p>
                    </ListTableCell>
                    <ListTableCell>
                      <span className="text-sm text-text capitalize">{form.audience}</span>
                    </ListTableCell>
                    <ListTableCell>
                      <span className="text-sm text-text capitalize">{form.duplicate_policy}</span>
                    </ListTableCell>
                    <ListTableCell>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        {form.status}
                      </span>
                    </ListTableCell>
                    <ListTableCell>
                      <span className="text-sm text-text">{formatDateOnly(form.created_at)}</span>
                    </ListTableCell>
                    <ListTableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        {canWrite && (
                          <ActionLink
                            to={toRoute('adminFormDetail', { id: form.id })}
                            title="Edit Form"
                            aria-label="Edit Form"
                          >
                            <Settings className="h-5 w-5" />
                          </ActionLink>
                        )}
                        {canWrite && (
                          <ActionLink
                            to={toRoute('adminFormFields', { id: form.id })}
                            title="Form Fields"
                            aria-label="Form Fields"
                          >
                            <FormInput className="h-5 w-5" />
                          </ActionLink>
                        )}
                        {canRead && (
                          <ActionLink
                            to={toRoute('adminFormSubmissions', { id: form.id })}
                            title="Submissions"
                            aria-label="Submissions"
                          >
                            <ClipboardList className="h-5 w-5" />
                          </ActionLink>
                        )}
                      </div>
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListTable>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-muted">
                {hasNextPage
                  ? `Showing ${forms.length} of ${totalCount} forms`
                  : `Showing all ${totalCount} form${totalCount === 1 ? '' : 's'}`}
              </p>
              {hasNextPage && (
                <Button
                  type="button"
                  variant="primaryOutline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </Button>
              )}
            </div>
            <div ref={loadMoreRef} className="h-1" />
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
