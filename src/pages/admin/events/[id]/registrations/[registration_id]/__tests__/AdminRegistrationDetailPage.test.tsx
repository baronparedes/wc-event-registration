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

  it('renders invalid param, loading, and not-found states', () => {
    mockUseParams.mockReturnValueOnce({ id: undefined, registration_id: undefined })
    const { rerender } = render(<AdminRegistrationDetailPage />)
    expect(screen.getByText('Invalid registration ID')).toBeInTheDocument()

    mockUseParams.mockReturnValue({ id: 'event-1', registration_id: 'reg-1' })
    mockUseRegistrationDetailQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
      error: null,
    })
    rerender(<AdminRegistrationDetailPage />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
    expect(screen.getByText('Loading registration details...')).toBeInTheDocument()

    mockUseRegistrationDetailQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      error: null,
    })
    rerender(<AdminRegistrationDetailPage />)
    expect(screen.getByText('Not Found')).toBeInTheDocument()
  })

  it('renders query errors with Error and unknown values', () => {
    mockUseRegistrationDetailQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      error: new Error('boom'),
    })
    const { rerender } = render(<AdminRegistrationDetailPage />)
    expect(screen.getByText(/Error loading registration: boom/)).toBeInTheDocument()

    mockUseRegistrationDetailQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      error: 'bad value',
    })
    rerender(<AdminRegistrationDetailPage />)
    expect(screen.getByText(/Error loading registration: Unknown error/)).toBeInTheDocument()
  })

  it('formats rich field response types and unknown status labels', () => {
    mockUseRegistrationDetailQuery.mockReturnValue({
      data: {
        registration: {
          id: 'reg-2',
          status: 'pending_review',
          submitted_at: '2026-06-27T10:00:00.000Z',
          updated_at: null,
        },
        member: {
          member_id: 'WC-002',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          role: 'captain',
          category: 'adult',
          nickname: 'JD',
        },
        fieldResponses: [
          {
            field_id: 'f1',
            field_label: 'Toggle Obj',
            field_type: 'multi_select_toggle',
            answer: { one: true, two: false, three: 'maybe' },
          },
          {
            field_id: 'f2',
            field_label: 'Toggle Primitive',
            field_type: 'multi_select_toggle',
            answer: 'raw',
          },
          {
            field_id: 'f3',
            field_label: 'Boolean',
            field_type: 'boolean',
            answer: false,
          },
          {
            field_id: 'f4',
            field_label: 'Boolean Unknown',
            field_type: 'boolean',
            answer: 'unexpected',
          },
          {
            field_id: 'f5',
            field_label: 'Choices',
            field_type: 'multi_select',
            answer: ['A', 'B'],
          },
          {
            field_id: 'f6',
            field_label: 'Checkbox Raw',
            field_type: 'checkbox',
            answer: 'single',
          },
          {
            field_id: 'f7',
            field_label: 'Date',
            field_type: 'date',
            answer: '2026-06-27T10:00:00.000Z',
          },
          {
            field_id: 'f8',
            field_label: 'Date Raw',
            field_type: 'date',
            answer: 9,
          },
          {
            field_id: 'f9',
            field_label: 'Null',
            field_type: 'text',
            answer: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    render(<AdminRegistrationDetailPage />)

    expect(screen.getByText('pending_review')).toBeInTheDocument()
    expect(screen.getByText('JD')).toBeInTheDocument()
    expect(screen.getByText('one: Yes, two: No, three: maybe')).toBeInTheDocument()
    expect(screen.getByText('raw')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('unexpected')).toBeInTheDocument()
    expect(screen.getByText('A, B')).toBeInTheDocument()
    expect(screen.getByText('single')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows fallback errors for failed cancel/reactivate mutations', async () => {
    mockUseRegistrationDetailQuery.mockReturnValue({
      data: {
        registration: {
          id: 'reg-1',
          status: 'submitted',
          submitted_at: '2026-06-27T10:00:00.000Z',
          updated_at: null,
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
    mockCancelMutateAsync.mockRejectedValueOnce('cancel failed')

    const { rerender } = render(<AdminRegistrationDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Registration' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel Registration' })[1])

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to cancel registration')
    })

    mockUseRegistrationDetailQuery.mockReturnValue({
      data: {
        registration: {
          id: 'reg-1',
          status: 'cancelled',
          submitted_at: '2026-06-27T10:00:00.000Z',
          updated_at: null,
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
    mockReactivateMutateAsync.mockRejectedValueOnce('reactivate failed')

    rerender(<AdminRegistrationDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Registration' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Reactivate Registration' })[1])

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to reactivate registration')
    })
  })

  it('navigates back when using the back button', () => {
    mockUseRegistrationDetailQuery.mockReturnValue({
      data: {
        registration: {
          id: 'reg-1',
          status: 'submitted',
          submitted_at: '2026-06-27T10:00:00.000Z',
          updated_at: null,
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
    fireEvent.click(screen.getByRole('button', { name: /Back to Registrations/i }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('surfaces error.message for Error objects from cancel/reactivate', async () => {
    mockUseRegistrationDetailQuery.mockReturnValue({
      data: {
        registration: {
          id: 'reg-1',
          status: 'submitted',
          submitted_at: '2026-06-27T10:00:00.000Z',
          updated_at: null,
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
    mockCancelMutateAsync.mockRejectedValueOnce(new Error('cancel message'))

    const { rerender } = render(<AdminRegistrationDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Registration' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel Registration' })[1])

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('cancel message')
    })

    mockUseRegistrationDetailQuery.mockReturnValue({
      data: {
        registration: {
          id: 'reg-1',
          status: 'cancelled',
          submitted_at: '2026-06-27T10:00:00.000Z',
          updated_at: null,
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
    mockReactivateMutateAsync.mockRejectedValueOnce(new Error('reactivate message'))

    rerender(<AdminRegistrationDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Registration' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Reactivate Registration' })[1])

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('reactivate message')
    })
  })
})
