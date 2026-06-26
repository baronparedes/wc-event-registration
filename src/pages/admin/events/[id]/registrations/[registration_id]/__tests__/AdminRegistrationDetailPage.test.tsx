import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUseParams,
  mockNavigate,
  mockUseRegistrationDetailQuery,
  mockCancelMutateAsync,
  mockReactivateMutateAsync,
  mockShowError,
} = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseRegistrationDetailQuery: vi.fn(),
  mockCancelMutateAsync: vi.fn(),
  mockReactivateMutateAsync: vi.fn(),
  mockShowError: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/hooks/domain/registrations', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/registrations')>(
    '@/hooks/domain/registrations',
  )
  return {
    ...actual,
    useRegistrationDetailQuery: (...args: unknown[]) => mockUseRegistrationDetailQuery(...args),
    useCancelRegistrationMutation: () => ({ mutateAsync: mockCancelMutateAsync, isPending: false }),
    useReactivateRegistrationMutation: () => ({
      mutateAsync: mockReactivateMutateAsync,
      isPending: false,
    }),
  }
})

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/utils')>('@/hooks/utils')
  return {
    ...actual,
    useErrorWithFadeout: () => ({ showError: mockShowError }),
  }
})

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: (props: {
    isOpen: boolean
    title: string
    onConfirm: () => void
    confirmLabel: string
  }) =>
    props.isOpen ? (
      <div>
        <div>{props.title}</div>
        <button type="button" onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
      </div>
    ) : null,
}))

import { AdminRegistrationDetailPage } from '@/pages/admin/events/[id]/registrations/[registration_id]'

describe('AdminRegistrationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'event-1', registration_id: 'reg-1' })
    mockCancelMutateAsync.mockResolvedValue(undefined)
    mockReactivateMutateAsync.mockResolvedValue(undefined)
  })

  it('renders registration details and cancels active registrations', async () => {
    mockUseRegistrationDetailQuery.mockReturnValue({
      data: {
        registration: {
          id: 'reg-1',
          status: 'submitted',
          submitted_at: '2026-06-27T10:00:00.000Z',
          updated_at: '2026-06-27T10:00:00.000Z',
        },
        member: {
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: null,
          role: 'player',
          category: 'adult',
          nickname: null,
        },
        fieldResponses: [],
      },
      isLoading: false,
      error: null,
    })

    render(<AdminRegistrationDetailPage />)

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(
      screen.getByText('No field responses recorded for this registration.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Registration' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel Registration' })[1])

    await waitFor(() => {
      expect(mockCancelMutateAsync).toHaveBeenCalledWith({ registration_id: 'reg-1' })
    })
    expect(mockNavigate).toHaveBeenCalledWith('/admin/events/event-1/registrations')
  })

  it('shows reactivate action for cancelled registrations', async () => {
    mockUseRegistrationDetailQuery.mockReturnValue({
      data: {
        registration: {
          id: 'reg-1',
          status: 'cancelled',
          submitted_at: '2026-06-27T10:00:00.000Z',
          updated_at: '2026-06-27T10:00:00.000Z',
        },
        member: {
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: null,
          role: 'player',
          category: 'adult',
          nickname: null,
        },
        fieldResponses: [
          {
            field_id: 'field-1',
            field_label: 'Team Name',
            field_type: 'text',
            answer: 'A-Team',
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(<AdminRegistrationDetailPage />)

    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Registration' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Reactivate Registration' })[1])

    await waitFor(() => {
      expect(mockReactivateMutateAsync).toHaveBeenCalledWith({ registration_id: 'reg-1' })
    })
  })
})
