import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  mockProfileStepCard,
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
    mockProfileStepCard: vi.fn(),
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

vi.mock('@/config/env', () => ({
  env: {
    supabaseUrl: 'http://127.0.0.1:54321',
    supabaseAnonKey: 'anon-key',
    registrationWizardEnabled: true,
  },
}))

const envMock = vi.mocked(await import('@/config/env')).env

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
  ProfileStepCard: (props: {
    stepTimeoutSecondsRemaining?: number | null
    onContinueToStepThree?: () => void
  }) => {
    mockProfileStepCard(props)
    return (
      <div>
        <div>Profile Step</div>
        {props.stepTimeoutSecondsRemaining ? (
          <div>Step 2 reset in {props.stepTimeoutSecondsRemaining}s</div>
        ) : null}
        {props.onContinueToStepThree ? (
          <button onClick={props.onContinueToStepThree} type="button">
            Continue to Step 3
          </button>
        ) : null}
      </div>
    )
  },
  LockedGateCard: () => {
    mockLockedGateCard()
    return <div>Locked Gate</div>
  },
  DynamicFieldsStepCard: (props: {
    submitButtonLabel?: string
    submitErrorMessage: string | null
    submitSuccessMessage: string | null
    onSubmit: (values: Record<string, unknown>) => void | Promise<void>
    stepTimeoutSecondsRemaining?: number | null
  }) => {
    mockDynamicFieldsStepCard(props)

    return (
      <div>
        <div>{props.submitButtonLabel}</div>
        {props.stepTimeoutSecondsRemaining ? (
          <div>Step 3 reset in {props.stepTimeoutSecondsRemaining}s</div>
        ) : null}
        {props.submitErrorMessage ? <div>{props.submitErrorMessage}</div> : null}
        {props.submitSuccessMessage ? <div>{props.submitSuccessMessage}</div> : null}
        <button onClick={() => void props.onSubmit({ team_name: 'A-Team' })} type="button">
          Trigger Submit
        </button>
      </div>
    )
  },
}))

import { EventRegistrationPage } from '../index'

describe('EventRegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockUseParams.mockReturnValue({ slug: 'sample-event' })
    mockUseRfidAutoFocus.mockReturnValue(mockFocusMemberIdInput)
    mockUseErrorWithFadeout.mockReturnValue({
      error: null,
      isFadingOut: false,
      showError: vi.fn(),
      clearError: vi.fn(),
    })
    mockUseKioskInactivityReset.mockReturnValue({ secondsRemaining: 180 })
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
    envMock.registrationWizardEnabled = true
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

  it('keeps wizard update-mode lookups on step 2 before continuing', async () => {
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

    await act(async () => {
      await mockScanBufferHandler.current?.('WC-100')
    })

    expect(screen.getByText('Profile Step')).toBeInTheDocument()
    expect(screen.queryByText('Update')).toBeNull()
    expect(screen.getByRole('button', { name: 'Continue to Step 3' })).toBeInTheDocument()
  })

  it('keeps blocked lookup results on wizard step 2 with the shared 15 second reset', async () => {
    vi.useFakeTimers()

    const runMemberLookupSubmit = vi.fn().mockResolvedValue({
      success: false,
      error: 'You are already registered for this event.',
      reason: 'already_registered',
    })

    mockUseMemberLookupState.mockReturnValue({
      ...memberLookupState,
      matchedMember: null,
      isRegistrationBlocked: false,
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

    await act(async () => {
      await mockScanBufferHandler.current?.('WC-102')
    })

    expect(screen.getByText('Profile Step')).toBeInTheDocument()
    expect(screen.getByText('Step 2 reset in 15s')).toBeInTheDocument()
    expect(screen.queryByText('Member Lookup')).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    expect(screen.getByText('Member Lookup')).toBeInTheDocument()
  })

  it('keeps completed step badges styled when wizard reaches step 3', async () => {
    const runMemberLookupSubmit = vi.fn().mockResolvedValue({
      success: true,
      mode: 'new_registration',
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

    await act(async () => {
      await mockScanBufferHandler.current?.('WC-101')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Step 3' }))

    expect(screen.getByText('Submit Registration')).toBeInTheDocument()
    expect(screen.getByText('1')).toHaveClass('bg-secondary')
    expect(screen.getByText('2')).toHaveClass('bg-secondary')
    expect(screen.getByText('3')).toHaveClass('bg-primary')
  })

  it('returns wizard users to step 1 if they stop on step 2 too long', async () => {
    vi.useFakeTimers()

    const runMemberLookupSubmit = vi.fn().mockResolvedValue({
      success: true,
      mode: 'new_registration',
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

    await act(async () => {
      await mockScanBufferHandler.current?.('WC-101')
    })

    expect(screen.getByText('Profile Step')).toBeInTheDocument()
    expect(screen.getByText('Step 2 reset in 15s')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })

    expect(screen.getByText('Member Lookup')).toBeInTheDocument()
  })

  it('returns wizard users to step 1 if they stop on step 3 for three minutes', async () => {
    vi.useFakeTimers()

    const runMemberLookupSubmit = vi.fn().mockResolvedValue({
      success: true,
      mode: 'new_registration',
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

    await act(async () => {
      await mockScanBufferHandler.current?.('WC-101')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Step 3' }))

    expect(screen.getByText('Submit Registration')).toBeInTheDocument()
    expect(screen.getByText('Step 3 reset in 180s')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(180_000)
    })

    expect(screen.getByText('Member Lookup')).toBeInTheDocument()
  })

  it('shows the classic kiosk timer on the profile and registration cards', async () => {
    envMock.registrationWizardEnabled = false

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

    expect(screen.getByText('Profile Step')).toBeInTheDocument()
    expect(screen.getByText('Step 2 reset in 180s')).toBeInTheDocument()
    expect(screen.getByText('Step 3 reset in 180s')).toBeInTheDocument()
  })
})
