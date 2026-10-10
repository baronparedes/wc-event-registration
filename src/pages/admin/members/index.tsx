import { useMemo, useState } from 'react';

import { BadgeCheck, Download, Edit, Upload, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  AdminInfiniteScrollFooter,
  AlertBanner,
  Button,
  ContactButtons,
  EmptyState,
  SearchInputField,
} from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { Avatar } from '@/components/ui/Avatar';
import { FormSelectField } from '@/components/ui/FormSelectField';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { PAGINATION_DEFAULTS, ROUTE_PATHS, UI_MESSAGES, toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminMembersQuery, useExportMembersCSVMutation } from '@/hooks/domain/members';
import { useDebounceSearch, useInfiniteScrollTrigger, useIsMobileViewport } from '@/hooks/utils';
import { canAdminPerform } from '@/lib/domain/auth';
import type { AdminMember } from '@/lib/domain/members';
import { formatDateOnly } from '@/lib/infrastructure';

import {
  AddMemberDialog,
  MemberStatusBadge,
  MobileMemberCard,
  UpdateMemberIdDialog,
} from './components';

function getHeaderDescription(canWrite: boolean) {
  if (canWrite) {
    return 'View and manage member profiles and details.';
  }

  return 'View member profiles and details.';
}

function MemberActions({ member, canWrite }: { member: AdminMember; canWrite: boolean }) {
  const canEdit = canWrite && member.is_active;
  let actionLabel = 'View Member';

  if (canEdit) {
    actionLabel = 'Edit Member';
  }

  return (
    <div className="flex items-center gap-3">
      <ActionLink
        to={toRoute('adminMemberDetail', { id: member.id })}
        title={actionLabel}
        aria-label={actionLabel}
      >
        {canEdit && <Edit className="h-5 w-5" />}
        {!canEdit && <User className="h-5 w-5" />}
      </ActionLink>
      {canEdit && (
        <UpdateMemberIdDialog
          memberId={member.id}
          memberName={member.full_name}
          currentMemberId={member.member_id}
        />
      )}
    </div>
  );
}

function EmptyMembersState({ hasSearch }: { hasSearch: boolean }) {
  let title = 'No members yet';
  let description = 'Members will appear here once they are added to the system';

  if (hasSearch) {
    title = 'No members found';
    description = 'Try adjusting your search filters';
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-12">
      <EmptyState icon={<Users className="h-6 w-6" />} title={title} description={description} />
    </div>
  );
}

function getMemberRowClassName(isActive: boolean) {
  if (isActive) {
    return 'cursor-pointer';
  }

  return 'cursor-pointer opacity-70';
}

function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AdminMembersPage() {
  const navigate = useNavigate();
  const { data: authState } = useAdminAuthQuery();
  const { searchTerm, setSearchTerm, normalizedSearchTerm, clearSearch } = useDebounceSearch();
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const [attributeFilter, setAttributeFilter] = useState<MemberAttributeFilter>('all');

  const membersQuery = useAdminMembersQuery({
    pageSize: PAGINATION_DEFAULTS.adminMembersPageSize,
    searchTerm: normalizedSearchTerm,
    statusFilter,
    attributeFilter,
  });
  const exportMembersMutation = useExportMembersCSVMutation({
    search_term: normalizedSearchTerm,
    status_filter: statusFilter,
    attribute_filter: attributeFilter,
  });

  const pages = membersQuery.data?.pages;
  const members = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const totalCount = pages?.[0]?.totalCount ?? 0;
  const hasNextPage = Boolean(membersQuery.hasNextPage);
  const isFetchingNextPage = Boolean(membersQuery.isFetchingNextPage);
  const fetchNextPage = membersQuery.fetchNextPage;

  const isLoading = membersQuery.isLoading;
  const error = membersQuery.error;
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const isMobileViewport = useIsMobileViewport();
  const hasError = Boolean(error);
  const hasNoMembers = !hasError && members.length === 0;
  const hasMembers = !hasError && members.length > 0;

  const { sentinelRef } = useInfiniteScrollTrigger({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  function handleStatusFilterChange(nextStatusFilter: 'active' | 'deleted' | 'all') {
    setStatusFilter(nextStatusFilter);
  }

  function handleAttributeFilterChange(nextAttributeFilter: MemberAttributeFilter) {
    setAttributeFilter(nextAttributeFilter);
  }

  function handleClearFilters() {
    clearSearch();
    setStatusFilter('active');
    setAttributeFilter('all');
  }

  async function handleExportMembers() {
    const result = await exportMembersMutation.mutateAsync().catch((exportError: unknown) => {
      toast.error(
        exportError instanceof Error ? exportError.message : 'Failed to export members CSV.',
      );
      return null;
    });

    if (!result) {
      return;
    }

    const { text, filename } = result;
    downloadCsv(text, filename || 'members.csv');
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Members' }]}
        title="Manage Members"
        description={getHeaderDescription(canWrite)}
        actions={
          <>
            {canWrite && (
              <>
                <Button
                  className="w-full sm:w-auto sm:inline-flex"
                  type="button"
                  variant="primaryOutline"
                  onClick={handleExportMembers}
                  disabled={exportMembersMutation.isPending}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exportMembersMutation.isPending ? 'Exporting...' : 'Export CSV'}
                </Button>
                <Button
                  className="w-full sm:w-auto sm:inline-flex"
                  type="button"
                  variant="primaryOutline"
                  onClick={() => navigate(ROUTE_PATHS.adminMembersImport)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
                <AddMemberDialog className="w-full sm:w-auto sm:inline-flex" />
              </>
            )}
          </>
        }
      />

      <AdminBaseNavigation />

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <SearchInputField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onClear={clearSearch}
            placeholder="Search by first name, last name, nickname, email, or member ID"
          />
          <div className="flex w-full flex-col gap-1 text-sm text-muted">
            <FormSelectField
              ariaLabel="Status"
              value={statusFilter}
              onChange={(value) => handleStatusFilterChange(value as 'active' | 'deleted' | 'all')}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'deleted', label: 'Deleted' },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>
          <div className="flex w-full flex-col gap-1 text-sm text-muted">
            <FormSelectField
              ariaLabel="Contact Info"
              value={attributeFilter}
              onChange={(value) => handleAttributeFilterChange(value as MemberAttributeFilter)}
              options={[
                { value: 'all', label: 'All Details' },
                { value: 'verified_email', label: 'Verified Email' },
                { value: 'no_mobile', label: 'No Mobile Number' },
                { value: 'no_email', label: 'No Email' },
                { value: 'with_mobile', label: 'With Mobile Number' },
                { value: 'with_email', label: 'With Email' },
              ]}
            />
          </div>
          <Button
            type="button"
            variant="primaryOutline"
            className="w-full sm:w-auto"
            onClick={handleClearFilters}
            disabled={normalizedSearchTerm.length === 0 && statusFilter === 'active' && attributeFilter === 'all'}
          >
            Clear
          </Button>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage={UI_MESSAGES.loading.members}>
        {hasError && (
          <AlertBanner variant="error" description={UI_MESSAGES.errors.membersLoadFailed} />
        )}
        {hasNoMembers && <EmptyMembersState hasSearch={normalizedSearchTerm.length > 0} />}
        {hasMembers && (
          <>
            <div className={isMobileViewport ? '' : 'rounded-2xl border border-border bg-surface'}>
              {isMobileViewport ? (
                <div className="space-y-3 pb-3">
                  {members.map((member) => (
                    <MobileMemberCard key={member.id} member={member} canWrite={canWrite} />
                  ))}
                </div>
              ) : (
                <ListTable>
                  <ListTableHead>
                    <ListTableHeaderRow>
                      <ListTableHeaderCell></ListTableHeaderCell>
                      <ListTableHeaderCell>Full Name</ListTableHeaderCell>
                      <ListTableHeaderCell className="px-6">Member ID</ListTableHeaderCell>
                      <ListTableHeaderCell>Status</ListTableHeaderCell>
                      <ListTableHeaderCell>Last Activity</ListTableHeaderCell>
                      <ListTableHeaderCell>Email</ListTableHeaderCell>
                      <ListTableHeaderCell>Phone</ListTableHeaderCell>
                      <ListTableHeaderCell>Role</ListTableHeaderCell>
                      <ListTableHeaderCell>Category</ListTableHeaderCell>
                      <ListTableHeaderCell>Joined</ListTableHeaderCell>
                      <ListTableHeaderCell>Actions</ListTableHeaderCell>
                    </ListTableHeaderRow>
                  </ListTableHead>
                  <ListTableBody>
                    {members.map((member) => (
                      <ListTableRow
                        key={member.id}
                        className={getMemberRowClassName(member.is_active)}
                        onClick={() => navigate(toRoute('adminMemberDetail', { id: member.id }))}
                      >
                        <ListTableCell>
                          <Avatar
                            size="sm"
                            name={`${member.nickname || ''} ${member.last_name || ''}`.trim()}
                            avatarObjectKey={member.avatar_object_key}
                          />
                        </ListTableCell>
                        <ListTableCell>
                          <p className="font-medium text-text">{member.full_name}</p>
                          {member.nickname && (
                            <p className="mt-0.5 text-xs text-muted">({member.nickname})</p>
                          )}
                        </ListTableCell>
                        <ListTableCell className="px-6">
                          <p className="font-mono text-sm text-text">{member.member_id}</p>
                        </ListTableCell>
                        <ListTableCell>
                          <MemberStatusBadge isActive={member.is_active} />
                        </ListTableCell>
                        <ListTableCell>
                          <p className="text-sm text-text">
                            {member.last_activity ? formatDateOnly(member.last_activity) : 'N/A'}
                          </p>
                        </ListTableCell>
                        <ListTableCell>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-text">{member.email || '—'}</p>
                            {member.has_account && member.email && (
                              <BadgeCheck
                                className="h-4 w-4 text-[#178e9f]"
                                aria-label="Verified account"
                              />
                            )}
                          </div>
                        </ListTableCell>
                        <ListTableCell onClick={(e) => e.stopPropagation()}>
                          {member.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text">{member.phone}</span>
                              <ContactButtons
                                phone={member.phone}
                                size="sm"
                                variant="icon"
                                showCopyFallback={false}
                              />
                            </div>
                          ) : (
                            <p className="text-sm text-text">—</p>
                          )}
                        </ListTableCell>
                        <ListTableCell>
                          <p className="text-sm text-text">{member.role || '—'}</p>
                        </ListTableCell>
                        <ListTableCell>
                          <p className="text-sm text-text">{member.category || '—'}</p>
                        </ListTableCell>
                        <ListTableCell>
                          <p className="text-sm text-text">{formatDateOnly(member.created_at)}</p>
                        </ListTableCell>
                        <ListTableCell onClick={(e) => e.stopPropagation()}>
                          <MemberActions member={member} canWrite={canWrite} />
                        </ListTableCell>
                      </ListTableRow>
                    ))}
                  </ListTableBody>
                </ListTable>
              )}

              <AdminInfiniteScrollFooter
                currentCount={members.length}
                totalCount={totalCount}
                entityName="member"
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onFetchNextPage={() => fetchNextPage()}
                sentinelRef={sentinelRef}
              />
            </div>
          </>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
