import { useEffect, useMemo, useState } from 'react'
import {
  PAGINATION_DEFAULTS,
  PAGINATION_OPTIONS,
  TIMING,
  toAdminMemberDetail,
} from '@/config/constants'
import { useAdminMembersQuery } from '@/hooks/domain/members'
import { formatDateOnly, getCurrentPageFromCursor, getPageCursor } from '@/lib/infrastructure'
import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls'
import { Button } from '@/components/ui/Button'
import { ActionLink } from '@/components/ui/ActionLink'
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable'
import { UpdateMemberIdDialog } from './components/UpdateMemberIdDialog'
import { AddMemberDialog } from './components/AddMemberDialog'

export function AdminMembersPage() {
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.adminMembersPageSize)
  const [cursor, setCursor] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const normalizedSearchTerm = useMemo(() => debouncedSearchTerm.trim(), [debouncedSearchTerm])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, TIMING.searchDebounceMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchTerm])

  const membersQuery = useAdminMembersQuery({
    pageSize,
    cursor,
    searchTerm: normalizedSearchTerm,
  })
  const members = membersQuery.data?.items ?? []
  const hasMore = membersQuery.data?.hasMore ?? false
  const nextCursor = membersQuery.data?.nextCursor ?? null
  const totalPages = membersQuery.data?.totalPages ?? 1
  const currentPage = getCurrentPageFromCursor(cursor, pageSize)

  const isLoading = membersQuery.isLoading
  const error = membersQuery.error

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm)
    setCursor(null)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize)
    setCursor(null)
  }

  function handleNextPage() {
    if (!nextCursor) return
    setCursor(nextCursor)
  }

  function handlePreviousPage() {
    setCursor(getPageCursor(currentPage - 1, pageSize))
  }

  function handleFirstPage() {
    setCursor(null)
  }

  function handleGoToPage(page: number) {
    setCursor(getPageCursor(page, pageSize))
  }

  function handleLastPage() {
    setCursor(getPageCursor(totalPages, pageSize))
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">Members</h1>
          <p className="text-sm text-muted">View and manage member profiles and details.</p>
          <p className="mt-1 text-xs text-muted">
            Page {currentPage} of {totalPages}
          </p>
        </div>
        <AddMemberDialog />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex w-full flex-col gap-1 text-sm text-muted sm:max-w-md">
            Search members
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => handleSearchTermChange(event.target.value)}
              placeholder="Search by first name, last name, nickname, or member ID"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSearchTermChange('')}
            disabled={normalizedSearchTerm.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">Loading members...</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">Failed to load members. Please refresh.</p>
        ) : members.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {normalizedSearchTerm.length > 0
              ? 'No members matched your search.'
              : 'No members found.'}
          </p>
        ) : (
          <>
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell className="px-6">Member ID</ListTableHeaderCell>
                  <ListTableHeaderCell>Full Name</ListTableHeaderCell>
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
                  <ListTableRow key={member.id}>
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
                    <ListTableCell>
                      <div className="flex items-center gap-3">
                        <ActionLink to={toAdminMemberDetail(member.id)}>Edit</ActionLink>
                        <UpdateMemberIdDialog
                          memberId={member.id}
                          memberName={member.full_name}
                          currentMemberId={member.member_id}
                        />
                      </div>
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListTable>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="hidden text-xs text-muted sm:block">
                {normalizedSearchTerm.length > 0
                  ? `Showing up to ${pageSize} matching members per page`
                  : `Showing up to ${pageSize} members per page`}
              </p>
              <AdminPaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoading}
                canGoPrevious={currentPage > 1}
                canGoNext={hasMore && Boolean(nextCursor)}
                pageSize={pageSize}
                pageSizeOptions={PAGINATION_OPTIONS.adminMembers}
                onPageSizeChange={handlePageSizeChange}
                onFirstPage={handleFirstPage}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
                onLastPage={handleLastPage}
                onGoToPage={handleGoToPage}
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
