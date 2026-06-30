import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMemberLookupState } from '../useMemberLookupState'

const { mockMutateAsync, mockLoggerInfo, mockLoggerWarn, mockLoggerError } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}))

vi.mock('@/hooks/domain/members/queries/useMemberLookupQuery', () => ({
  useMemberLookupQuery: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    logger: {
      ...actual.logger,
      info: mockLoggerInfo,
      warn: mockLoggerWarn,
      error: mockLoggerError,
      debug: vi.fn(),
    },
  }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return Wrapper
}

describe('useMemberLookupState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles a successful lookup for a new registration', async () => {
    mockMutateAsync.mockResolvedValue({
      profile: {
        user_id: '5f83f4cd-4370-4c4a-bd02-9730ec9bc8dc',
        full_name: 'Ada Lovelace',
        nickname: null,
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
      existing_registration: null,
    })

    const { result } = renderHook(() => useMemberLookupState('sample-event'), {
      wrapper: createWrapper(),
    })

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: ' WC-001 ' })
    })

    expect(outcome).toEqual({ success: true, mode: 'new_registration' })
    expect(result.current.matchedMember?.full_name).toBe('Ada Lovelace')
    expect(result.current.verifiedMemberId).toBe(' WC-001 ')
    expect(result.current.isUpdateMode).toBe(false)
    expect(result.current.prefillResponses).toBeNull()
  })

  it('blocks duplicate registrations and exposes the locked step message', async () => {
    mockMutateAsync.mockResolvedValue({
      profile: {
        user_id: '81c4946d-edeb-4f88-97fc-c7632d94f8f5',
        full_name: 'Grace Hopper',
        nickname: null,
        first_name: 'Grace',
        last_name: 'Hopper',
      },
      existing_registration: {
        exists: true,
        edit_allowed: false,
        status: 'submitted',
        responses: {},
      },
    })

    const { result } = renderHook(() => useMemberLookupState('sample-event'), {
      wrapper: createWrapper(),
    })

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-002' })
    })

    expect(outcome).toEqual({
      success: false,
      error: 'You are already registered for this event.',
      reason: 'already_registered',
    })
    expect(result.current.isRegistrationBlocked).toBe(true)
    expect(result.current.lockedStepMessage).toBe(
      'Already registered for this event. Verify another member.',
    )
    expect(result.current.memberIdHighlight).toBe(true)
  })

  it('returns not found when the lookup service does not return a profile', async () => {
    mockMutateAsync.mockResolvedValue({ profile: null, existing_registration: null })

    const { result } = renderHook(() => useMemberLookupState('sample-event'), {
      wrapper: createWrapper(),
    })

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-404' })
    })

    expect(outcome).toEqual({
      success: false,
      error: 'We could not verify that entry. Please contact your administrator for support.',
      reason: 'not_found',
    })
    expect(mockLoggerWarn).toHaveBeenCalled()
    expect(result.current.matchedMember).toBeNull()
  })

  it('resets state on lookup errors', async () => {
    mockMutateAsync.mockRejectedValue(new Error('lookup failed'))

    const onMemberCleared = vi.fn()
    const { result } = renderHook(() => useMemberLookupState('sample-event', onMemberCleared), {
      wrapper: createWrapper(),
    })

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-500' })
    })

    expect(outcome).toEqual({
      success: false,
      error: 'Lookup is unavailable right now. Please try again in a moment.',
      reason: 'lookup_unavailable',
    })
    expect(mockLoggerError).toHaveBeenCalled()
    expect(result.current.isRegistrationBlocked).toBe(false)
    expect(onMemberCleared).toHaveBeenCalledTimes(1)
  })

  it('clears state via reset and clearMember actions', async () => {
    mockMutateAsync.mockResolvedValue({
      profile: {
        user_id: '84446979-2e14-4812-a076-9360c4f92fc0',
        full_name: 'Alan Turing',
        nickname: null,
        first_name: 'Alan',
        last_name: 'Turing',
      },
      existing_registration: null,
    })

    const onMemberCleared = vi.fn()
    const { result } = renderHook(() => useMemberLookupState('sample-event', onMemberCleared), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'WC-003' })
    })

    act(() => {
      result.current.clearMember()
    })

    expect(result.current.matchedMember).toBeNull()
    expect(result.current.verifiedMemberId).toBeNull()
    expect(onMemberCleared).toHaveBeenCalledTimes(2)

    act(() => {
      result.current.reset()
    })

    expect(onMemberCleared).toHaveBeenCalledTimes(3)

    await waitFor(() => {
      expect(result.current.lookupForm.getValues('memberId')).toBe('')
    })
  })
})
