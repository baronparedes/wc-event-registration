import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockNavigate,
  mockUseParams,
  mockUseAdminMemberQuery,
  mockUseUpdateMemberMutation,
  mockUpdateMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
  mockUseAdminMemberQuery: vi.fn(),
  mockUseUpdateMemberMutation: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members')
  return {
    ...actual,
    useAdminMemberQuery: (...args: unknown[]) => mockUseAdminMemberQuery(...args),
    useUpdateMemberMutation: () => mockUseUpdateMemberMutation(),
  }
})

import { AdminMemberDetailPage } from '@/pages/admin/members/[id]'

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <AdminMemberDetailPage />
    </MemoryRouter>,
  )
}

describe('AdminMemberDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'user-1' })
    mockUseUpdateMemberMutation.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    })
    mockUseAdminMemberQuery.mockReturnValue({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: '',
        email: 'jane@example.com',
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: 'adult',
      },
      isLoading: false,
      isError: false,
    })
    mockUpdateMutateAsync.mockResolvedValue(undefined)
  })

  it('renders missing id, loading, and not-found states', () => {
    mockUseParams.mockReturnValue({})

    const { rerender } = renderWithRouter()
    expect(screen.getByText('Member ID is missing.')).toBeInTheDocument()

    mockUseParams.mockReturnValue({ id: 'user-1' })
    mockUseAdminMemberQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
    })

    rerender(
      <MemoryRouter>
        <AdminMemberDetailPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading member...')).toBeInTheDocument()

    mockUseAdminMemberQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
    })

    rerender(
      <MemoryRouter>
        <AdminMemberDetailPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Member not found/i)).toBeInTheDocument()
  })

  it('navigates back when Cancel button is clicked', () => {
    renderWithRouter()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockNavigate).toHaveBeenCalledWith('/admin/members')
  })

  it('enables save when dirty and submits updated member data', async () => {
    renderWithRouter()

    const saveButton = await screen.findByRole('button', { name: 'Save Changes' })
    expect(saveButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Full Name *'), {
      target: { value: 'Jane Updated' },
    })

    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })

    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'user-1',
        full_name: 'Jane Updated',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: '',
        email: 'jane@example.com',
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: 'adult',
      })
    })

    expect(mockToastSuccess).toHaveBeenCalledWith('Member updated successfully.')
    expect(mockNavigate).toHaveBeenCalledWith('/admin/members')
  })

  it('shows error toast when update fails', async () => {
    mockUpdateMutateAsync.mockRejectedValueOnce(new Error('update failed'))

    renderWithRouter()

    fireEvent.change(screen.getByLabelText('Full Name *'), {
      target: { value: 'Jane Updated' },
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('update failed')
    })
  })

  it('shows default error toast when update fails with non-Error value', async () => {
    mockUpdateMutateAsync.mockRejectedValueOnce('unknown failure')

    renderWithRouter()

    fireEvent.change(screen.getByLabelText('Full Name *'), {
      target: { value: 'Jane Updated' },
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to update member.')
    })
  })

  it('shows not found state when query returns no member data without query error', () => {
    mockUseAdminMemberQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    })

    renderWithRouter()

    expect(screen.getByText(/Member not found/i)).toBeInTheDocument()
  })

  it('renders pending save state as disabled Saving button', () => {
    mockUseUpdateMemberMutation.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: true,
    })

    renderWithRouter()

    const savingButton = screen.getByRole('button', { name: 'Saving...' })
    expect(savingButton).toBeDisabled()
  })

  it('keeps save disabled when form is dirty but mutation is pending', async () => {
    mockUseUpdateMemberMutation.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: true,
    })

    renderWithRouter()

    fireEvent.change(screen.getByLabelText('Full Name *'), {
      target: { value: 'Jane Dirty' },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    })
  })

  it('normalizes nullable member fields into empty form values', async () => {
    mockUseAdminMemberQuery.mockReturnValue({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        full_name: 'Jane Doe',
        first_name: null,
        last_name: null,
        nickname: null,
        email: null,
        phone: null,
        date_of_birth: null,
        role: 'player',
        category: 'adult',
      },
      isLoading: false,
      isError: false,
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toHaveValue('')
      expect(screen.getByLabelText('Last Name')).toHaveValue('')
      expect(screen.getByLabelText('Nickname')).toHaveValue('')
      expect(screen.getByLabelText('Email')).toHaveValue('')
      expect(screen.getByLabelText('Phone')).toHaveValue('')
      expect(screen.getByLabelText('Date of Birth')).toHaveValue('')
    })
  })
})
