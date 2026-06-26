import { useEffect, useMemo, useState } from 'react'
import { useAdminMembersQuery } from '@/hooks/domain/members'
import { formatDateOnly, getCurrentPageFromCursor, getPageCursor } from '@/lib/infrastructure'
import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls'
import { Button } from '@/components/ui/Button'
import { ActionLink } from '@/components/ui/ActionLink'
import { UpdateMemberIdDialog } from './components/UpdateMemberIdDialog'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function AdminMembersPage() {
  const [pageSize, setPageSize] = useState<number>(20)
  const [cursor, setCursor] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const normalizedSearchTerm = useMemo(() => debouncedSearchTerm.trim(), [debouncedSearchTerm])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-6 py-3">Member ID</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => (
                    <tr key={member.id} className="transition hover:bg-background/50">
                      <td className="px-6 py-4">
                        <p className="font-mono text-sm text-text">{member.member_id}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-text">{member.full_name}</p>
                        {member.nickname && (
                          <p className="mt-0.5 text-xs text-muted">({member.nickname})</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-text">{member.email || '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-text">{member.phone || '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-text">{member.role || '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-text">{member.category || '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-text">{formatDateOnly(member.created_at)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <ActionLink to={`/admin/members/${member.id}`}>Edit</ActionLink>
                          <UpdateMemberIdDialog
                            memberId={member.id}
                            memberName={member.full_name}
                            currentMemberId={member.member_id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
                pageSizeOptions={PAGE_SIZE_OPTIONS}
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
