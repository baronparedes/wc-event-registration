import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUseParams,
  mockToastSuccess,
  mockToastError,
  mockUsePublicEventQuery,
  mockUsePublicEventFieldsQuery,
  mockSubmitMutateAsync,
  mockUseSubmitRegistrationMutation,
  mockUseMemberLookupState,
  mockUseRfidAutoFocus,
  mockUseErrorWithFadeout,
  mockUseScanBuffer,
  mockUseKioskInactivityReset,
  mockFocusMemberIdInput,
  mockScanBufferHandler,
  mockDynamicFieldsStepCard,
  mockLockedGateCard,
  memberLookupState,
} = vi.hoisted(() => {
  const lookupState = {
    matchedMember: {
      user_id: 'user-1',
      full_name: 'Jane Doe',
      nickname: null,
      first_name: 'Jane',
      last_name: 'Doe',
    },
    verifiedMemberId: 'WC-001',
    memberIdHighlight: false,
    isRegistrationBlocked: false,
    isUpdateMode: false,
    lockedStepMessage: null,
    prefillResponses: null,
    lookupForm: {
      reset: vi.fn(),
      register: vi.fn(),
      handleSubmit: vi.fn(),
      formState: { errors: {} },
      setValue: vi.fn(),
      watch: vi.fn(),
      getValues: vi.fn(),
      control: {},
    },
    isLookupPending: false,
    handleLookupSubmit: vi.fn(),
    clearMember: vi.fn(),
    reset: vi.fn(),
  }

  return {
    mockUseParams: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockUsePublicEventQuery: vi.fn(),
    mockUsePublicEventFieldsQuery: vi.fn(),
    mockSubmitMutateAsync: vi.fn(),
    mockUseSubmitRegistrationMutation: vi.fn(),
    mockUseMemberLookupState: vi.fn(),
    mockUseRfidAutoFocus: vi.fn(),
    mockUseErrorWithFadeout: vi.fn(),
    mockUseScanBuffer: vi.fn(),
    mockUseKioskInactivityReset: vi.fn(),
    mockFocusMemberIdInput: vi.fn(),
    mockScanBufferHandler: { current: null as null | ((scanValue: string) => void) },
    mockDynamicFieldsStepCard: vi.fn(),
    mockLockedGateCard: vi.fn(),
    memberLookupState: lookupState,
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useParams: () => mockUseParams(),
  }
})

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
    usePublicEventQuery: (...args: unknown[]) => mockUsePublicEventQuery(...args),
  }
})

vi.mock('@/hooks/domain/event-fields', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/event-fields')>(
    '@/hooks/domain/event-fields',
  )

  return {
    ...actual,
    usePublicEventFieldsQuery: (...args: unknown[]) => mockUsePublicEventFieldsQuery(...args),
  }
})

vi.mock('@/hooks/domain/registrations', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/registrations')>(
    '@/hooks/domain/registrations',
  )

  return {
    ...actual,
    useSubmitRegistrationMutation: () => mockUseSubmitRegistrationMutation(),
  }
})

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members')

  return {
    ...actual,
    useMemberLookupState: (...args: unknown[]) => mockUseMemberLookupState(...args),
  }
})

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/utils')>('@/hooks/utils')

  return {
    ...actual,
    useRfidAutoFocus: (...args: unknown[]) => {
      mockUseRfidAutoFocus(...args)
      return mockFocusMemberIdInput
    },
    useErrorWithFadeout: (...args: unknown[]) => mockUseErrorWithFadeout(...args),
    useScanBuffer: (...args: unknown[]) => {
      mockUseScanBuffer(...args)

      const [handler] = args as [(scanValue: string) => void]
      mockScanBufferHandler.current = handler
    },
    useKioskInactivityReset: (...args: unknown[]) => mockUseKioskInactivityReset(...args),
  }
})

vi.mock('@/pages/events/[slug]/register/components', () => ({
  EventHeaderCard: () => <div>Event Header</div>,
  MemberLookupStepCard: () => <div>Member Lookup</div>,
  ProfileStepCard: () => <div>Profile Step</div>,
  LockedGateCard: () => {
    mockLockedGateCard()
    return <div>Locked Gate</div>
  },
  DynamicFieldsStepCard: (props: {
    submitButtonLabel?: string
    submitErrorMessage: string | null
    submitSuccessMessage: string | null
    onSubmit: (values: Record<string, unknown>) => void | Promise<void>
  }) => {
    mockDynamicFieldsStepCard(props)

    return (
      <div>
        <div>{props.submitButtonLabel}</div>
        {props.submitErrorMessage ? <div>{props.submitErrorMessage}</div> : null}
        {props.submitSuccessMessage ? <div>{props.submitSuccessMessage}</div> : null}
        <button onClick={() => void props.onSubmit({ team_name: 'A-Team' })} type="button">
          Trigger Submit
        </button>
      </div>
    )
  },
}))

import { EventRegistrationPage } from '@/pages/events/[slug]/register'

describe('EventRegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ slug: 'sample-event' })
    mockUseRfidAutoFocus.mockReturnValue(mockFocusMemberIdInput)
    mockUseErrorWithFadeout.mockReturnValue({
      error: null,
      isFadingOut: false,
      showError: vi.fn(),
      clearError: vi.fn(),
    })
    mockUseSubmitRegistrationMutation.mockReturnValue({
      mutateAsync: mockSubmitMutateAsync,
      isPending: false,
    })
    mockUseMemberLookupState.mockReturnValue(memberLookupState)
    mockScanBufferHandler.current = null
    mockUsePublicEventFieldsQuery.mockReturnValue({
      data: {
        validFields: [
          {
            id: 'field-1',
            event_id: 'event-1',
            field_key: 'team_name',
            label: 'Team Name',
            field_type: 'text',
            is_required: true,
            is_active: true,
            placeholder: null,
            help_text: null,
            options: [],
            validation_rules: {},
            display_order: 0,
          },
        ],
        issues: [],
      },
      isLoading: false,
      isError: false,
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '11111111-1111-1111-1111-111111111111',
    )
  })

  it('renders locked gate when event is unavailable', () => {
    mockUsePublicEventQuery.mockReturnValue({
      data: { status: 'unavailable', reason: 'registration_closed' },
      isLoading: false,
      isError: false,
    })

    render(<EventRegistrationPage />)

    expect(screen.getByText('Locked Gate')).toBeInTheDocument()
    expect(mockLockedGateCard).toHaveBeenCalled()
  })

  it('submits registration successfully in update mode and surfaces success message', async () => {
    mockUseMemberLookupState.mockReturnValue({
      ...memberLookupState,
      isUpdateMode: true,
      prefillResponses: { team_name: 'Old Team' },
    })
    mockUsePublicEventQuery.mockReturnValue({
      data: {
        status: 'available',
        event: {
          id: 'event-1',
          slug: 'sample-event',
          title: 'Sample Event',
          description: null,
          location: null,
          starts_at: null,
          ends_at: null,
          registration_opens_at: null,
          registration_closes_at: null,
          registration_mode: 'open',
        },
        registration_count: 5,
      },
      isLoading: false,
      isError: false,
    })
    mockSubmitMutateAsync.mockResolvedValueOnce({
      success: true,
      registration_id: 'reg-1',
      status: 'updated',
      is_new: false,
      message: 'Updated',
    })

    render(<EventRegistrationPage />)

    expect(screen.getByText('Update')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Submit' }))

    await waitFor(() => {
      expect(mockSubmitMutateAsync).toHaveBeenCalledWith({
        event_slug: 'sample-event',
        member_id: 'WC-001',
        responses: { team_name: 'A-Team' },
        idempotency_key: '11111111-1111-1111-1111-111111111111',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Registration submitted successfully. ID: reg-1')).toBeInTheDocument()
    })

    expect(mockToastSuccess).toHaveBeenCalledWith('Registration submitted successfully!')
  })

  it('surfaces duplicate-blocked submission errors', async () => {
    mockUsePublicEventQuery.mockReturnValue({
      data: {
        status: 'available',
        event: {
          id: 'event-1',
          slug: 'sample-event',
          title: 'Sample Event',
          description: null,
          location: null,
          starts_at: null,
          ends_at: null,
          registration_opens_at: null,
          registration_closes_at: null,
          registration_mode: 'open',
        },
        registration_count: 5,
      },
      isLoading: false,
      isError: false,
    })
    mockSubmitMutateAsync.mockResolvedValueOnce({
      success: false,
      error: 'Duplicate blocked',
      error_code: 'duplicate_blocked',
    })

    render(<EventRegistrationPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Submit' }))

    await waitFor(() => {
      expect(screen.getByText('You have already registered for this event.')).toBeInTheDocument()
    })

    expect(mockToastError).toHaveBeenCalledWith('Already registered for this event')
  })

  it('shows validation error when event slug is missing at submit time', async () => {
    mockUseParams.mockReturnValue({ slug: undefined })
    mockUsePublicEventQuery.mockReturnValue({
      data: {
        status: 'available',
        event: {
          id: 'event-1',
          slug: 'sample-event',
          title: 'Sample Event',
          description: null,
          location: null,
          starts_at: null,
          ends_at: null,
          registration_opens_at: null,
          registration_closes_at: null,
          registration_mode: 'open',
        },
        registration_count: 5,
      },
      isLoading: false,
      isError: false,
    })

    render(<EventRegistrationPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Submit' }))

    await waitFor(() => {
      expect(screen.getByText('Event slug is missing')).toBeInTheDocument()
    })

    expect(mockSubmitMutateAsync).not.toHaveBeenCalled()
  })

  it('shows unavailable-event error when submission is attempted while event is not available', async () => {
    mockUsePublicEventQuery.mockReturnValue({
      data: {
        status: 'unavailable',
        reason: 'registration_closed',
      },
      isLoading: false,
      isError: false,
    })

    render(<EventRegistrationPage />)

    expect(screen.getByText('Locked Gate')).toBeInTheDocument()
    expect(mockDynamicFieldsStepCard).not.toHaveBeenCalled()
  })

  it('runs scan-buffer success path and update-mode scroll branch', async () => {
    const runMemberLookupSubmit = vi.fn().mockResolvedValue({
      success: true,
      mode: 'update_registration',
    })

    mockUseMemberLookupState.mockReturnValue({
      ...memberLookupState,
      matchedMember: null,
      handleLookupSubmit: runMemberLookupSubmit,
    })

    mockUsePublicEventQuery.mockReturnValue({
      data: {
        status: 'available',
        event: {
          id: 'event-1',
          slug: 'sample-event',
          title: 'Sample Event',
          description: null,
          location: null,
          starts_at: null,
          ends_at: null,
          registration_opens_at: null,
          registration_closes_at: null,
          registration_mode: 'open',
        },
        registration_count: 5,
      },
      isLoading: false,
      isError: false,
    })

    render(<EventRegistrationPage />)

    expect(mockScanBufferHandler.current).toBeTypeOf('function')

    await mockScanBufferHandler.current?.('WC-100')

    expect(runMemberLookupSubmit).toHaveBeenCalledWith({ memberId: 'WC-100' })
  })
})
