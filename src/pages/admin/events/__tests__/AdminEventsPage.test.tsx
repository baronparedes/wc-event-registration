import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUseAdminEventsQuery,
  mockPublishMutateAsync,
  mockArchiveMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseAdminEventsQuery: vi.fn(),
  mockPublishMutateAsync: vi.fn(),
  mockArchiveMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events')
  return {
    ...actual,
    useAdminEventsQuery: (...args: unknown[]) => mockUseAdminEventsQuery(...args),
    usePublishEventMutation: () => ({ mutateAsync: mockPublishMutateAsync, isPending: false }),
    useArchiveEventMutation: () => ({ mutateAsync: mockArchiveMutateAsync, isPending: false }),
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')
  return {
    ...actual,
    formatDateOnly: vi.fn(() => '2026-07-01'),
    getCurrentPageFromCursor: vi.fn(() => 1),
    getPageCursor: vi.fn(() => null),
  }
})

vi.mock('@/pages/admin/events/components', () => ({
  EventStatusBadge: (props: { status: string }) => <div>{props.status}</div>,
  DuplicatePolicyLabel: (props: { policy: string }) => <div>{props.policy}</div>,
  PublishActionButton: (props: {
    event: { id: string; title: string }
    onPublish: (id: string, title: string) => void
  }) => (
    <button type="button" onClick={() => props.onPublish(props.event.id, props.event.title)}>
      Publish
    </button>
  ),
}))

vi.mock('@/components/ui/ActionConfirmButton', () => ({
  ActionConfirmButton: (props: { onConfirm: () => void; children: string }) => (
    <button type="button" onClick={props.onConfirm}>
      {props.children}
    </button>
  ),
}))

import { AdminEventsPage } from '@/pages/admin/events'

describe('AdminEventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAdminEventsQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'event-1',
            title: 'Sample Event',
            slug: 'sample-event',
            status: 'draft',
            duplicate_policy: 'block',
            registration_mode: 'open',
            starts_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })
    mockPublishMutateAsync.mockResolvedValue(undefined)
    mockArchiveMutateAsync.mockResolvedValue(undefined)
  })

  it('renders event rows and handles publish/archive actions', async () => {
    render(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Sample Event')).toBeInTheDocument()
    expect(screen.getByText('sample-event')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))

    await waitFor(() => {
      expect(mockPublishMutateAsync).toHaveBeenCalledWith('event-1')
      expect(mockArchiveMutateAsync).toHaveBeenCalledWith('event-1')
    })

    expect(mockToastSuccess).toHaveBeenCalledWith('"Sample Event" has been published.')
    expect(mockToastSuccess).toHaveBeenCalledWith('"Sample Event" has been archived.')
  })
})
