import { useEffect, useMemo, useState } from 'react'
import { useAdminMembersQuery } from '@/hooks/domain/members'
import { formatDateOnly } from '@/lib/infrastructure'
import { Button } from '@/components/ui/Button'
import { ActionLink } from '@/components/ui/ActionLink'
import { UpdateMemberIdDialog } from './components/UpdateMemberIdDialog'

export function AdminMembersPage() {
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([])
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
    pageSize: 20,
    cursor,
    searchTerm: normalizedSearchTerm,
  })
  const members = membersQuery.data?.items ?? []
  const hasMore = membersQuery.data?.hasMore ?? false
  const nextCursor = membersQuery.data?.nextCursor ?? null
  const currentPage = useMemo(() => cursorHistory.length + 1, [cursorHistory.length])

  const isLoading = membersQuery.isLoading
  const error = membersQuery.error

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm)
    setCursor(null)
    setCursorHistory([])
  }

  function handleNextPage() {
    if (!nextCursor) return
    setCursorHistory((prev) => [...prev, cursor])
    setCursor(nextCursor)
  }

  function handlePreviousPage() {
    setCursorHistory((prev) => {
      if (prev.length === 0) return prev
      const nextHistory = [...prev]
      const previousCursor = nextHistory.pop() ?? null
      setCursor(previousCursor)
      return nextHistory
    })
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">Members</h1>
          <p className="text-sm text-muted">View and manage member profiles and details.</p>
          <p className="mt-1 text-xs text-muted">Page {currentPage}</p>
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

            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <p className="text-xs text-muted">
                {normalizedSearchTerm.length > 0
                  ? 'Showing up to 20 matching members per page'
                  : 'Showing up to 20 members per page'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={cursorHistory.length === 0 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasMore || !nextCursor || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
