import { useEffect, useMemo, useState } from 'react';

import { Edit, Loader2, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminPageShell, AdminSubNavLink } from '@/components/layout';
import { Button, EmptyState, FormInputField } from '@/components/ui';
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
import { PAGINATION_DEFAULTS, ROUTE_PATHS, TIMING, UI_MESSAGES, toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminMembersQuery } from '@/hooks/domain/members';
import { useInfiniteScrollTrigger } from '@/hooks/utils';
import { canAdminPerform } from '@/lib/domain/auth';
import type { AdminMember } from '@/lib/domain/members';
import { formatDateOnly } from '@/lib/infrastructure';

import { AddMemberDialog } from './components/AddMemberDialog';
import { UpdateMemberIdDialog } from './components/UpdateMemberIdDialog';

function getHeaderDescription(canWrite: boolean) {
  if (canWrite) {
    return 'View and manage member profiles and details.';
  }

  return 'View member profiles and details.';
}

function MemberStatus({ isActive }: { isActive: boolean }) {
  let statusClassName = 'bg-red-100 text-red-700';
  let statusLabel = 'Deleted';

  if (isActive) {
    statusClassName = 'bg-secondary/15 text-secondary';
    statusLabel = 'Active';
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClassName}`}>
      {statusLabel}
    </span>
  );
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

function getPaginationSummary(hasNextPage: boolean, memberCount: number, totalCount: number) {
  if (hasNextPage) {
    return `Showing ${memberCount} of ${totalCount} members`;
  }

  let memberLabel = 'members';

  if (totalCount === 1) {
    memberLabel = 'member';
  }

  return `Showing all ${totalCount} ${memberLabel}`;
}

function getMemberRowClassName(isActive: boolean) {
  if (isActive) {
    return 'cursor-pointer';
  }

  return 'cursor-pointer opacity-70';
}

export function AdminMembersPage() {
  const navigate = useNavigate();
  const { data: authState } = useAdminAuthQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');
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

  const membersQuery = useAdminMembersQuery({
    pageSize: PAGINATION_DEFAULTS.adminMembersPageSize,
    searchTerm: normalizedSearchTerm,
    statusFilter,
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
  const hasError = Boolean(error);
  const hasNoMembers = !hasError && members.length === 0;
  const hasMembers = !hasError && members.length > 0;

  const loadMoreRef = useInfiniteScrollTrigger({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm);
  }

  function handleStatusFilterChange(nextStatusFilter: 'active' | 'deleted' | 'all') {
    setStatusFilter(nextStatusFilter);
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Members' }]}
        title="Manage Members"
        description={getHeaderDescription(canWrite)}
        actions={
          <>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primaryOutline"
                onClick={() => navigate(ROUTE_PATHS.adminMemberMilestones)}
              >
                Milestones
              </Button>
              {canWrite && (
                <>
                  <Button
                    type="button"
                    variant="primaryOutline"
                    onClick={() => navigate(ROUTE_PATHS.adminMembersImport)}
                  >
                    Upload CSV
                  </Button>
                  <AddMemberDialog />
                </>
              )}
            </div>
          </>
        }
      />

      <AdminPageShell.SubNav>
        <AdminSubNavLink to={ROUTE_PATHS.adminEvents}>Events</AdminSubNavLink>
        <AdminSubNavLink to={ROUTE_PATHS.adminMembers}>Members</AdminSubNavLink>
      </AdminPageShell.SubNav>

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex w-full flex-col gap-1 text-sm text-muted">
            <FormInputField
              value={searchTerm}
              onChange={(event) => handleSearchTermChange(event.target.value)}
              placeholder="Search by first name, last name, nickname, email, or member ID"
              inputClassName="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>
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
              selectClassName="rounded-xl py-2"
            />
          </div>
          <Button
            type="button"
            variant="primaryOutline"
            className="w-full sm:w-auto"
            onClick={() => handleSearchTermChange('')}
            disabled={normalizedSearchTerm.length === 0}
          >
            Clear
          </Button>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage={UI_MESSAGES.loading.members}>
        {hasError && (
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-red-600">{UI_MESSAGES.errors.membersLoadFailed}</p>
          </div>
        )}
        {hasNoMembers && <EmptyMembersState hasSearch={normalizedSearchTerm.length > 0} />}
        {hasMembers && (
          <>
            <div className="rounded-2xl border border-border bg-surface">
              <ListTable>
                <ListTableHead>
                  <ListTableHeaderRow>
                    <ListTableHeaderCell></ListTableHeaderCell>
                    <ListTableHeaderCell className="px-6">Member ID</ListTableHeaderCell>
                    <ListTableHeaderCell>Full Name</ListTableHeaderCell>
                    <ListTableHeaderCell>Status</ListTableHeaderCell>
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
                          className="mr-2"
                        />
                      </ListTableCell>
                      <ListTableCell className="px-6">
                        <p className="font-mono text-sm text-text">{member.member_id}</p>
                      </ListTableCell>
                      <ListTableCell>
                        <p className="font-medium text-text">{member.full_name}</p>
                        {member.nickname && (
                          <p className="mt-0.5 text-xs text-muted">({member.nickname})</p>
                        )}
                      </ListTableCell>
                      <ListTableCell>
                        <MemberStatus isActive={member.is_active} />
                      </ListTableCell>
                      <ListTableCell>
                        <p className="text-sm text-text">{member.email || '—'}</p>
                      </ListTableCell>
                      <ListTableCell>
                        <p className="text-sm text-text">{member.phone || '—'}</p>
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

              <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-muted">
                  {getPaginationSummary(hasNextPage, members.length, totalCount)}
                </p>
                {hasNextPage && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="primaryOutline"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage && (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </span>
                      )}
                      {!isFetchingNextPage && 'Load More'}
                    </Button>
                  </div>
                )}
              </div>
              <div ref={loadMoreRef} className="h-1" />
            </div>
          </>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
