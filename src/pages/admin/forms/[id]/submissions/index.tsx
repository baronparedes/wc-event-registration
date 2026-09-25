import { useMemo, useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { AdminInfiniteScrollFooter, Button, FormInputField } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminFormQuery, useFormSubmissionsQuery } from '@/hooks/domain/forms';
import { useDebounceSearch } from '@/hooks/utils';
import type { FormSubmission } from '@/lib/domain/forms';
import { FormNavigationLinks } from '@/pages/admin/forms/components';

import { ExportSubmissionsButton, SubmissionDetailDialog, SubmissionsList } from './components';

type SourceFilter = 'all' | 'member' | 'guest';

export function AdminFormSubmissionsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: form, isLoading: formLoading, error: formError } = useAdminFormQuery(id);
  const targetFormId = form?.id || id;
  const {
    data: rawSubmissions,
    isLoading: submissionsLoading,
    error: submissionsError,
  } = useFormSubmissionsQuery(targetFormId);

  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const { searchTerm, setSearchTerm, debouncedSearchTerm, clearSearch } = useDebounceSearch();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const normalizedSearchTerm = useMemo(
    () => debouncedSearchTerm.trim().toLowerCase(),
    [debouncedSearchTerm],
  );

  const allSubmissions = useMemo(() => rawSubmissions ?? [], [rawSubmissions]);

  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter((sub) => {
      if (sourceFilter !== 'all' && sub.source !== sourceFilter) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const fullName = (
        sub.users?.full_name ||
        [sub.public_registrant_info?.first_name, sub.public_registrant_info?.last_name]
          .filter(Boolean)
          .join(' ')
      ).toLowerCase();

      const memberId = (sub.users?.member_id ?? '').toLowerCase();
      const email = (sub.users?.email ?? sub.public_registrant_info?.email ?? '').toLowerCase();
      const phone = (sub.public_registrant_info?.phone ?? '').toLowerCase();

      return (
        fullName.includes(normalizedSearchTerm) ||
        memberId.includes(normalizedSearchTerm) ||
        email.includes(normalizedSearchTerm) ||
        phone.includes(normalizedSearchTerm)
      );
    });
  }, [allSubmissions, normalizedSearchTerm, sourceFilter]);

  const isLoading = formLoading || submissionsLoading;
  const error = formError || submissionsError;

  if (error) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Submissions" />
        <AdminPageShell.Content>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-red-600">
              Error loading submissions: {error instanceof Error ? error.message : String(error)}
            </p>
          </div>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const isFormArchived = form?.status === 'archived';
  const totalCount = allSubmissions.length;
  const filteredCount = filteredSubmissions.length;
  const hasFilterActive = normalizedSearchTerm.length > 0 || sourceFilter !== 'all';

  const navLinks = form ? (
    <FormNavigationLinks formId={form.id} currentSection="submissions" />
  ) : undefined;

  const navActions = (
    <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto md:justify-end">
      <ExportSubmissionsButton
        submissions={filteredSubmissions}
        formTitle={form?.title}
        formSlug={form?.slug}
        disabled={isLoading || filteredCount === 0}
      />
    </div>
  );

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Forms', to: ROUTE_PATHS.adminForms },
          {
            label: form?.title ?? 'Form',
            to: form ? toRoute('adminFormDetail', { id: form.id }) : undefined,
          },
          { label: 'Submissions' },
        ]}
        navLinks={navLinks}
        title="Manage Submissions"
        description={
          form
            ? `${totalCount} form submission${totalCount === 1 ? '' : 's'}`
            : 'Manage form submissions'
        }
        actions={navActions}
      />

      {form && form.status !== 'draft' && (
        <div
          className={`rounded-lg p-3 ${
            isFormArchived
              ? 'border border-yellow-200 bg-yellow-50'
              : 'border border-blue-200 bg-blue-50'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              isFormArchived ? 'text-yellow-800' : 'text-blue-800'
            }`}
          >
            {isFormArchived
              ? 'This form is closed. Submissions are read-only.'
              : 'This form is published. All submissions are visible.'}
          </p>
        </div>
      )}

      {form && form.status === 'draft' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">
            This form is in draft mode. Submissions are not yet open to the public.
          </p>
        </div>
      )}

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_auto_auto] sm:items-end">
          <FormInputField
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by respondent, member ID, or email"
            inputClassName="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
          />

          {/* Source Tabs */}
          <div className="flex items-center rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                sourceFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('member')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                sourceFilter === 'member'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Members
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('guest')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                sourceFilter === 'guest'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Guests
            </button>
          </div>

          <Button
            type="button"
            variant="primaryOutline"
            onClick={() => {
              clearSearch();
              setSourceFilter('all');
            }}
            disabled={!hasFilterActive}
          >
            Clear
          </Button>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading submissions...">
        {!form && !isLoading ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Form not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminForms}>
              Back to forms
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface">
            <SubmissionsList
              submissions={filteredSubmissions}
              isLoading={isLoading}
              searchTerm={normalizedSearchTerm}
              onSelectSubmission={setSelectedSubmission}
            />

            <AdminInfiniteScrollFooter
              currentCount={filteredCount}
              totalCount={totalCount}
              entityName="submission"
              className="border-t border-border px-4 py-3 sm:px-6"
            />
          </div>
        )}

        <SubmissionDetailDialog
          submission={selectedSubmission}
          isOpen={Boolean(selectedSubmission)}
          onClose={() => setSelectedSubmission(null)}
        />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
