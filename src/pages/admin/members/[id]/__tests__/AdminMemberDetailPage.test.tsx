import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockNavigate,
  mockUseParams,
  mockUseAdminMemberQuery,
  mockUpdateMutateAsync,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
  mockUseAdminMemberQuery: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
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
    error: vi.fn(),
  },
}))

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members')
  return {
    ...actual,
    useAdminMemberQuery: (...args: unknown[]) => mockUseAdminMemberQuery(...args),
    useUpdateMemberMutation: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }),
  }
})

import { AdminMemberDetailPage } from '@/pages/admin/members/[id]'

describe('AdminMemberDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'user-1' })
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

  it('enables save when dirty and submits updated member data', async () => {
    render(<AdminMemberDetailPage />)

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
})
