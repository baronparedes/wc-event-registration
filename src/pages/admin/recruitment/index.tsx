import { useMemo, useState } from 'react';

import { Settings, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  Badge,
  Button,
  EmptyState,
  FormSelectField,
  SearchInputField,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminRecruitmentApplicationsInfiniteQuery } from '@/hooks/domain/recruitment';
import { useDebounceSearch, useInfiniteScrollTrigger, useIsMobileViewport } from '@/hooks/utils';
import {
  RECRUITMENT_ROLES,
  RECRUITMENT_STEPS,
  type RecruitmentApplication,
  type RecruitmentApplicationStatus,
} from '@/lib/domain/recruitment';

import {
  ExportRecruitmentCsvButton,
  RecruitmentApplicantDetailDialog,
  RecruitmentMobileList,
  RecruitmentTable,
} from './components';

type StatusFilterOption = RecruitmentApplicationStatus | 'all';

const STATUS_OPTIONS: Array<{ value: StatusFilterOption; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'declined', label: 'Declined' },
  { value: 'all', label: 'All' },
];

const STEP_OPTIONS = [
  { label: 'All Steps', value: '' },
  ...RECRUITMENT_STEPS.map((s) => ({
    label: `Step ${s.stepNumber}: ${s.shortLabel}`,
    value: String(s.stepNumber),
  })),
];

const ROLE_OPTIONS = [
  { label: 'All Roles', value: '' },
  ...RECRUITMENT_ROLES.map((role) => ({
    label: role,
    value: role,
  })),
];

export function AdminRecruitmentPage() {
  const navigate = useNavigate();
  const { can } = useAdminAuthQuery();
  const canWrite = can('canWriteAdminData');
  const isMobile = useIsMobileViewport();

  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('active');
  const [stepFilter, setStepFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedApplication, setSelectedApplication] = useState<RecruitmentApplication | null>(
    null,
  );

  const { searchTerm, setSearchTerm, normalizedSearchTerm, clearSearch } = useDebounceSearch();

  const currentStep = stepFilter ? Number(stepFilter) : undefined;
  const statusParam = statusFilter === 'all' ? undefined : statusFilter;
  const roleParam = roleFilter || undefined;

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminRecruitmentApplicationsInfiniteQuery({
      searchTerm: normalizedSearchTerm,
      status: statusParam,
      currentStep,
      role: roleParam,
    });

  const { sentinelRef } = useInfiniteScrollTrigger({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const applications = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const totalCount = data?.pages[0]?.totalCount ?? 0;

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Volunteer Recruitment Pipeline"
        description="Oversee the 9-step volunteer lifecycle, applicant sessions, pastoral coaching rubrics, and deployments."
        badge={
          <Badge variant="outline" className="font-mono">
            {totalCount} {totalCount === 1 ? 'applicant' : 'applicants'}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportRecruitmentCsvButton
              searchTerm={normalizedSearchTerm}
              status={statusParam}
              currentStep={currentStep}
              role={roleParam}
            />
            {canWrite && (
              <Button
                variant="primaryOutline"
                onClick={() => navigate(ROUTE_PATHS.adminSettingsRecruitment)}
                className="w-full sm:w-auto"
              >
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Recruitment Settings
              </Button>
            )}
          </div>
        }
        breadcrumbs={[{ label: 'Recruitment' }]}
      />

      <AdminBaseNavigation />

      <AdminPageShell.Filters>
        <div className="space-y-4">
          <Tabs
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as StatusFilterOption)}
          >
            <TabsList containerClassName="justify-start" className="w-auto">
              {STATUS_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value}>
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-3">
            <SearchInputField
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onClear={clearSearch}
              placeholder="Search by name, nickname, email, phone..."
            />

            <FormSelectField
              placeholder=""
              ariaLabel="Filter by Step"
              value={stepFilter}
              onChange={(val) => setStepFilter(val)}
              options={STEP_OPTIONS}
            />

            <FormSelectField
              placeholder=""
              ariaLabel="Filter by Role"
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              options={ROLE_OPTIONS}
            />
          </div>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content>
        {isLoading ? (
          <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-border bg-surface">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-center text-sm text-danger">
            {error instanceof Error ? error.message : 'Failed to load recruitment applications.'}
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Users className="h-8 w-8 text-muted" />}
              title="No applicants found"
              description={
                searchTerm || stepFilter || roleFilter || statusFilter !== 'all'
                  ? 'No recruitment applications match the current filter criteria.'
                  : 'No volunteer recruitment applications have been received yet.'
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {isMobile ? (
              <RecruitmentMobileList
                applications={applications}
                onSelectApplication={(app) => setSelectedApplication(app)}
              />
            ) : (
              <RecruitmentTable
                applications={applications}
                onSelectApplication={(app) => setSelectedApplication(app)}
              />
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 text-center">
              {isFetchingNextPage && <Spinner size="sm" />}
            </div>
          </div>
        )}
      </AdminPageShell.Content>

      <RecruitmentApplicantDetailDialog
        application={selectedApplication}
        isOpen={!!selectedApplication}
        onClose={() => setSelectedApplication(null)}
      />
    </AdminPageShell>
  );
}
