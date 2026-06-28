import { act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FORM_MESSAGES, TIMING, TOAST_MESSAGES } from '@/config/constants'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'
import {
  stepBadgeClassName,
  useEventRegistrationPageState,
} from '@/pages/events/[slug]/register/hooks'

const {
  mockUseParams,
  mockUsePublicEventQuery,
  mockUsePublicEventFieldsQuery,
  mockUseSubmitRegistrationMutation,
  mockUseMemberLookupState,
  mockUseRfidAutoFocus,
  mockUseErrorWithFadeout,
  mockUseScanBuffer,
  mockUseKioskInactivityReset,
  mockShowLookupError,
  mockClearLookupError,
  mockFocusMemberIdInput,
  mockSubmitMutateAsync,
  mockToastError,
  mockToastSuccess,
  mockScanHandler,
  memberLookupState,
} = vi.hoisted(() => {
  const state = {
    matchedMember: null as {
      user_id: string
      full_name: string
      nickname: string | null
      first_name: string
      last_name: string
    } | null,
    verifiedMemberId: null as string | null,
    memberIdHighlight: false,
    isRegistrationBlocked: false,
    isUpdateMode: false,
    lockedStepMessage: null as string | null,
    prefillResponses: null as Record<string, unknown> | null,
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
    mockUsePublicEventQuery: vi.fn(),
    mockUsePublicEventFieldsQuery: vi.fn(),
    mockUseSubmitRegistrationMutation: vi.fn(),
    mockUseMemberLookupState: vi.fn(),
    mockUseRfidAutoFocus: vi.fn(),
    mockUseErrorWithFadeout: vi.fn(),
    mockUseScanBuffer: vi.fn(),
    mockUseKioskInactivityReset: vi.fn(),
    mockShowLookupError: vi.fn(),
    mockClearLookupError: vi.fn(),
    mockFocusMemberIdInput: vi.fn(),
    mockSubmitMutateAsync: vi.fn(),
    mockToastError: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockScanHandler: { current: null as null | ((scanValue: string) => void) },
    memberLookupState: state,
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useParams: () => mockUseParams(),
  }
})

vi.mock('@/hooks/domain/events', () => ({
  usePublicEventQuery: (...args: unknown[]) => mockUsePublicEventQuery(...args),
}))

vi.mock('@/hooks/domain/event-fields', () => ({
  usePublicEventFieldsQuery: (...args: unknown[]) => mockUsePublicEventFieldsQuery(...args),
}))

vi.mock('@/hooks/domain/registrations', () => ({
  useSubmitRegistrationMutation: () => mockUseSubmitRegistrationMutation(),
}))

vi.mock('@/hooks/domain/members', () => ({
  useMemberLookupState: (...args: unknown[]) => mockUseMemberLookupState(...args),
}))

vi.mock('@/hooks/utils', () => ({
  useRfidAutoFocus: (...args: unknown[]) => {
    mockUseRfidAutoFocus(...args)
    return mockFocusMemberIdInput
  },
  useErrorWithFadeout: (...args: unknown[]) => mockUseErrorWithFadeout(...args),
  useScanBuffer: (...args: unknown[]) => {
    mockUseScanBuffer(...args)
    const [handler] = args as [(scanValue: string) => void]
    mockScanHandler.current = handler
  },
  useKioskInactivityReset: (...args: unknown[]) => mockUseKioskInactivityReset(...args),
}))

describe('useEventRegistrationPageState', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    memberLookupState.matchedMember = null
    memberLookupState.verifiedMemberId = null
    memberLookupState.isRegistrationBlocked = false
    memberLookupState.isUpdateMode = false
    memberLookupState.prefillResponses = null
    memberLookupState.handleLookupSubmit.mockReset()
    memberLookupState.clearMember.mockReset()
    memberLookupState.reset.mockReset()
    memberLookupState.lookupForm.reset.mockReset()

    mockUseParams.mockReturnValue({ slug: 'sample-event' })
    mockUsePublicEventQuery.mockReturnValue({
      data: {
        status: 'available',
        event: {
          id: 'event-1',
          registration_opens_at: '2026-06-28T10:00:00.000Z',
          registration_closes_at: '2026-06-28T22:00:00.000Z',
        },
      },
      isLoading: false,
      isError: false,
    })
    mockUsePublicEventFieldsQuery.mockReturnValue({
      data: {
        validFields: [],
        issues: [],
      },
      isLoading: false,
      isError: false,
    })
    mockSubmitMutateAsync.mockReset()
    mockToastError.mockReset()
    mockToastSuccess.mockReset()
    mockScanHandler.current = null
    mockUseSubmitRegistrationMutation.mockReturnValue({
      mutateAsync: mockSubmitMutateAsync,
      isPending: false,
    })
    mockUseMemberLookupState.mockReturnValue(memberLookupState)
    mockUseRfidAutoFocus.mockReturnValue(mockFocusMemberIdInput)
    mockUseErrorWithFadeout.mockReturnValue({
      error: null,
      isFadingOut: false,
      showError: mockShowLookupError,
      clearError: mockClearLookupError,
    })
    mockUseKioskInactivityReset.mockReturnValue({ secondsRemaining: 120 })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
  })

  it('returns badge styles by step state', () => {
    expect(stepBadgeClassName(2, 2)).toContain('bg-primary')
    expect(stepBadgeClassName(3, 1)).toContain('bg-secondary')
    expect(stepBadgeClassName(1, 3)).toContain('border-border')
  })

  it('derives wizard step 3 when member is matched and not blocked', () => {
    memberLookupState.matchedMember = {
      user_id: 'user-1',
      full_name: 'Jane Doe',
      nickname: null,
      first_name: 'Jane',
      last_name: 'Doe',
    }
    memberLookupState.isRegistrationBlocked = false

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('wizard'))

    expect(result.current.activeWizardStep).toBe(3)
    expect(result.current.wizardStepSecondsRemaining).toBe(
      Math.ceil(TIMING.kioskInactivityResetMs / 1000),
    )
  })

  it('moves to blocked confirm step on already registered lookup failure', async () => {
    memberLookupState.handleLookupSubmit.mockResolvedValue({
      success: false,
      error: 'Already registered',
      reason: 'already_registered',
    })

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('wizard'))

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'WC-1' })
    })

    await waitFor(() => {
      expect(result.current.activeWizardStep).toBe(2)
    })
    expect(result.current.isEffectiveRegistrationBlocked).toBe(true)
    expect(mockShowLookupError).toHaveBeenCalledWith('Already registered', {
      autoFadeOut: false,
    })
  })

  it('sets submit error when slug is missing', async () => {
    mockUseParams.mockReturnValue({})
    memberLookupState.matchedMember = {
      user_id: 'user-1',
      full_name: 'Jane Doe',
      nickname: null,
      first_name: 'Jane',
      last_name: 'Doe',
    }
    memberLookupState.verifiedMemberId = 'WC-001'

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('wizard'))

    await act(async () => {
      await result.current.handleSubmitRegistration({})
    })

    expect(result.current.submitErrorMessage).toBe(FORM_MESSAGES.eventSlugMissing)
    expect(mockSubmitMutateAsync).not.toHaveBeenCalled()
  })

  it('handles classic lookup success update path by scrolling to dynamic fields step', async () => {
    memberLookupState.handleLookupSubmit.mockResolvedValue({
      success: true,
      mode: 'update_registration',
    })

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('classic'))
    const scrollIntoView = vi.fn()

    act(() => {
      result.current.dynamicFieldsStepRef.current = {
        scrollIntoView,
      } as unknown as HTMLDivElement
    })

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'WC-1' })
    })

    expect(scrollIntoView).toHaveBeenCalled()
    expect(mockFocusMemberIdInput).not.toHaveBeenCalled()
  })

  it('handles classic lookup success new registration path by refocusing input', async () => {
    memberLookupState.handleLookupSubmit.mockResolvedValue({
      success: true,
      mode: 'new_registration',
    })

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('classic'))

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'WC-1' })
    })

    expect(mockFocusMemberIdInput).toHaveBeenCalled()
  })

  it('handles non-blocking lookup failure by returning to step 1 in wizard', async () => {
    memberLookupState.handleLookupSubmit.mockResolvedValue({
      success: false,
      error: 'Not found',
      reason: 'not_found',
    })

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('wizard'))

    act(() => {
      result.current.setWizardStep(3)
    })

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'WC-404' })
    })

    expect(result.current.activeWizardStep).toBe(1)
    expect(result.current.isEffectiveRegistrationBlocked).toBe(false)
    expect(mockShowLookupError).toHaveBeenCalledWith('Not found', { autoFadeOut: false })
  })

  it('runs the kiosk reset callback and clears wizard/member state', () => {
    const { result } = renderHookWithClient(() => useEventRegistrationPageState('classic'))
    const [kioskResetCallback] = mockUseKioskInactivityReset.mock.calls.at(-1) as [() => void]

    act(() => {
      result.current.setWizardStep(3)
      kioskResetCallback()
    })

    expect(memberLookupState.clearMember).toHaveBeenCalled()
    expect(memberLookupState.lookupForm.reset).toHaveBeenCalledWith({ memberId: '' })
    expect(result.current.activeWizardStep).toBe(1)
  })

  it('sets submit errors for missing member context and unavailable event', async () => {
    const { result } = renderHookWithClient(() => useEventRegistrationPageState('wizard'))

    await act(async () => {
      await result.current.handleSubmitRegistration({})
    })
    expect(result.current.submitErrorMessage).toBe(FORM_MESSAGES.memberLookupRequired)

    memberLookupState.matchedMember = {
      user_id: 'user-1',
      full_name: 'Jane Doe',
      nickname: null,
      first_name: 'Jane',
      last_name: 'Doe',
    }
    memberLookupState.verifiedMemberId = 'WC-001'
    mockUsePublicEventQuery.mockReturnValue({
      data: { status: 'unavailable', reason: 'registration_closed' },
      isLoading: false,
      isError: false,
    })

    const rerendered = renderHookWithClient(() => useEventRegistrationPageState('wizard'))
    await act(async () => {
      await rerendered.result.current.handleSubmitRegistration({})
    })

    expect(rerendered.result.current.submitErrorMessage).toBe(FORM_MESSAGES.eventNotAvailable)
  })

  it('handles submit failure and success paths including cancel update reset', async () => {
    memberLookupState.matchedMember = {
      user_id: 'user-1',
      full_name: 'Jane Doe',
      nickname: null,
      first_name: 'Jane',
      last_name: 'Doe',
    }
    memberLookupState.verifiedMemberId = 'WC-001'
    mockSubmitMutateAsync
      .mockResolvedValueOnce({
        success: false,
        error: 'Server unavailable',
      })
      .mockResolvedValueOnce({
        success: true,
        registration_id: 'reg-1',
      })

    const titleAnchor = document.createElement('div')
    titleAnchor.id = 'app-shell-title-anchor'
    titleAnchor.scrollIntoView = vi.fn()
    document.body.appendChild(titleAnchor)

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('wizard'))

    await act(async () => {
      await result.current.handleSubmitRegistration({})
    })
    expect(result.current.submitErrorMessage).toBe('Server unavailable')
    expect(mockToastError).toHaveBeenCalledWith('Server unavailable')

    await act(async () => {
      await result.current.handleSubmitRegistration({})
    })
    expect(result.current.submitSuccessMessage).toContain('reg-1')
    expect(mockFocusMemberIdInput).toHaveBeenCalled()
    expect(result.current.fieldErrorMessage('unknown')).toBeUndefined()

    act(() => {
      result.current.handleCancelUpdate()
    })
    expect(memberLookupState.reset).toHaveBeenCalled()
    expect(mockClearLookupError).toHaveBeenCalled()

    titleAnchor.remove()
  })

  it('maps duplicate blocked submission errors to the dedicated user message', async () => {
    memberLookupState.matchedMember = {
      user_id: 'user-1',
      full_name: 'Jane Doe',
      nickname: null,
      first_name: 'Jane',
      last_name: 'Doe',
    }
    memberLookupState.verifiedMemberId = 'WC-001'
    mockSubmitMutateAsync.mockResolvedValueOnce({
      success: false,
      error_code: 'duplicate_blocked',
      error: 'ignored',
    })

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('wizard'))

    await act(async () => {
      await result.current.handleSubmitRegistration({})
    })

    expect(result.current.submitErrorMessage).toBe('You have already registered for this event.')
    expect(mockToastError).toHaveBeenCalledWith(TOAST_MESSAGES.registration.alreadyRegistered)
  })

  it('scrolls to title after successful update-mode submission', async () => {
    memberLookupState.matchedMember = {
      user_id: 'user-1',
      full_name: 'Jane Doe',
      nickname: null,
      first_name: 'Jane',
      last_name: 'Doe',
    }
    memberLookupState.verifiedMemberId = 'WC-001'
    memberLookupState.isUpdateMode = true
    mockSubmitMutateAsync.mockResolvedValueOnce({
      success: true,
      registration_id: 'reg-2',
    })

    const titleAnchor = document.createElement('div')
    titleAnchor.id = 'app-shell-title-anchor'
    titleAnchor.scrollIntoView = vi.fn()
    document.body.appendChild(titleAnchor)

    const { result } = renderHookWithClient(() => useEventRegistrationPageState('wizard'))

    await act(async () => {
      await result.current.handleSubmitRegistration({})
    })

    expect(titleAnchor.scrollIntoView).toHaveBeenCalled()
    expect(mockFocusMemberIdInput).not.toHaveBeenCalled()

    titleAnchor.remove()
  })
})
