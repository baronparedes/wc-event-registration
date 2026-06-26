import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseAdminMembersQuery } = vi.hoisted(() => ({
  mockUseAdminMembersQuery: vi.fn(),
}))

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members')
  return {
    ...actual,
    useAdminMembersQuery: (...args: unknown[]) => mockUseAdminMembersQuery(...args),
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')
  return {
    ...actual,
    formatDateOnly: vi.fn(() => '2026-06-27'),
    getCurrentPageFromCursor: vi.fn(() => 1),
    getPageCursor: vi.fn(() => null),
  }
})

vi.mock('@/pages/admin/members/components/AddMemberDialog', () => ({
  AddMemberDialog: () => <div>Add Member Dialog</div>,
}))

vi.mock('@/pages/admin/members/components/UpdateMemberIdDialog', () => ({
  UpdateMemberIdDialog: () => <div>Update Member ID Dialog</div>,
}))

import { AdminMembersPage } from '@/pages/admin/members'

describe('AdminMembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders members table rows from query data', () => {
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'user-1',
            member_id: 'WC-001',
            full_name: 'Jane Doe',
            nickname: 'J',
            email: 'jane@example.com',
            phone: '123',
            role: 'player',
            category: 'adult',
            created_at: '2026-06-27T00:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })

    render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('WC-001')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Update Member ID Dialog')).toBeInTheDocument()
  })

  it('renders empty-state text when no members are returned', () => {
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        items: [],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })

    render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('No members found.')).toBeInTheDocument()
  })
})
