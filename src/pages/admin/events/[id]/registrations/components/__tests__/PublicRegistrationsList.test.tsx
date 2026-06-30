import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicRegistrationsList } from '@/pages/admin/events/[id]/registrations/components/PublicRegistrationsList'
import type { PublicRegistrationSummary } from '@/lib/domain/public-registrations'

const { mockCancelMutateAsync, mockReactivateMutateAsync, mockShowError } = vi.hoisted(() => ({
  mockCancelMutateAsync: vi.fn(),
  mockReactivateMutateAsync: vi.fn(),
  mockShowError: vi.fn(),
}))

vi.mock('@/hooks/domain/public-registrations', () => ({
  useCancelPublicRegistrationMutation: () => ({
    mutateAsync: mockCancelMutateAsync,
    isPending: false,
  }),
  useReactivatePublicRegistrationMutation: () => ({
    mutateAsync: mockReactivateMutateAsync,
    isPending: false,
  }),
}))

vi.mock('@/hooks/utils', () => ({
  useErrorWithFadeout: () => ({ showError: mockShowError }),
}))

const baseRegistration: PublicRegistrationSummary = {
  id: 'reg-1',
  first_name: 'Baron',
  last_name: 'Paredes',
  nickname: null,
  email: 'baron@email.com',
  phone: null,
  status: 'submitted',
  submitted_at: '2026-06-30T12:00:00.000Z',
}

function renderList(
  registrations: PublicRegistrationSummary[],
  options: { isEventArchived?: boolean; searchTerm?: string } = {},
) {
  return render(
    <MemoryRouter>
      <PublicRegistrationsList
        registrations={registrations}
        eventId="event-1"
        isEventArchived={options.isEventArchived}
        searchTerm={options.searchTerm}
      />
    </MemoryRouter>,
  )
}

describe('PublicRegistrationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCancelMutateAsync.mockResolvedValue({ success: true })
    mockReactivateMutateAsync.mockResolvedValue({ success: true })
  })

  it('shows Cancel for active rows and Reactivate for cancelled rows', () => {
    renderList([
      baseRegistration,
      {
        ...baseRegistration,
        id: 'reg-2',
        email: 'cancelled@email.com',
        status: 'cancelled',
      },
    ])

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(
      <MemoryRouter>
        <PublicRegistrationsList registrations={[]} eventId="event-1" isLoading />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading registrations...')).toBeInTheDocument()
  })

  it('renders empty state messages for default and search views', () => {
    const { rerender } = render(
      <MemoryRouter>
        <PublicRegistrationsList registrations={[]} eventId="event-1" />
      </MemoryRouter>,
    )

    expect(screen.getByText('No public registrations yet')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <PublicRegistrationsList registrations={[]} eventId="event-1" searchTerm="baron" />
      </MemoryRouter>,
    )

    expect(screen.getByText('No matches found')).toBeInTheDocument()
  })

  it('falls back to raw status badge text for unknown status values', () => {
    renderList([
      {
        ...baseRegistration,
        id: 'reg-unknown',
        status: 'pending_review' as unknown as PublicRegistrationSummary['status'],
      },
    ])

    expect(screen.getByText('pending_review')).toBeInTheDocument()
  })

  it('disables status actions when event is archived', () => {
    renderList([baseRegistration], { isEventArchived: true })

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('closes cancel dialog and shows inline error handler when cancel mutation fails', async () => {
    mockCancelMutateAsync.mockRejectedValue(new Error('cancel failed'))

    renderList([baseRegistration])

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Cancel Public Registration')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Registration' }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('cancel failed')
    })

    expect(screen.queryByText('Cancel Public Registration')).not.toBeInTheDocument()
  })

  it('closes cancel dialog when user dismisses it', () => {
    renderList([baseRegistration])

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Cancel Public Registration')).toBeInTheDocument()

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButtons[1])
    expect(screen.queryByText('Cancel Public Registration')).not.toBeInTheDocument()
  })

  it('calls cancel mutation with selected registration id', async () => {
    renderList([baseRegistration])

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Registration' }))

    await waitFor(() => {
      expect(mockCancelMutateAsync).toHaveBeenCalledWith({ registration_id: 'reg-1' })
    })
  })

  it('invokes reactivate mutation when confirming reactivate', async () => {
    renderList([
      {
        ...baseRegistration,
        id: 'reg-2',
        status: 'cancelled',
      },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Registration' }))

    await waitFor(() => {
      expect(mockReactivateMutateAsync).toHaveBeenCalledWith({ registration_id: 'reg-2' })
    })
  })

  it('closes reactivate dialog and shows error handler when mutation fails', async () => {
    mockReactivateMutateAsync.mockRejectedValue(new Error('reactivate failed'))

    renderList([
      {
        ...baseRegistration,
        id: 'reg-2',
        status: 'cancelled',
      },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }))
    expect(screen.getByText('Reactivate Public Registration')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Registration' }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('reactivate failed')
    })

    expect(screen.queryByText('Reactivate Public Registration')).not.toBeInTheDocument()
  })
})
