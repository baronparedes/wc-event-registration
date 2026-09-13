import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeExistingRegistrationState, makeMemberLookupProfile } from '@/__tests__/factories';

import { useMemberLookupState } from '../useMemberLookupState';

const { mockMutateAsync, mockLoggerInfo, mockLoggerWarn, mockLoggerError } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/hooks/domain/members/queries/useMemberLookupQuery', () => ({
  useMemberLookupQuery: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    logger: {
      ...actual.logger,
      info: mockLoggerInfo,
      warn: mockLoggerWarn,
      error: mockLoggerError,
      debug: vi.fn(),
    },
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return Wrapper;
}

describe('useMemberLookupState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles a successful lookup for a new registration', async () => {
    const profile = makeMemberLookupProfile();
    mockMutateAsync.mockResolvedValue({
      profile,
      existing_registration: null,
    });

    const { result } = renderHook(() => useMemberLookupState('sample-event'), {
      wrapper: createWrapper(),
    });

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: ' WC-001 ' });
    });

    expect(outcome).toEqual({ success: true, mode: 'new_registration' });
    expect(result.current.matchedMember?.full_name).toBe(profile.full_name);
    expect(result.current.verifiedMemberCredential).toBe(profile.member_token);
    expect(result.current.isUpdateMode).toBe(false);
    expect(result.current.prefillResponses).toBeNull();
  });

  it('blocks duplicate registrations and exposes the locked step message', async () => {
    const profile = makeMemberLookupProfile();
    const existingReg = makeExistingRegistrationState({
      exists: true,
      edit_allowed: false,
      status: 'submitted',
    });
    mockMutateAsync.mockResolvedValue({
      profile,
      existing_registration: existingReg,
    });

    const { result } = renderHook(() => useMemberLookupState('sample-event'), {
      wrapper: createWrapper(),
    });

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-001' });
    });

    expect(outcome).toEqual({
      success: false,
      error: 'You are already registered for this event.',
      reason: 'already_registered',
    });
    expect(result.current.isRegistrationBlocked).toBe(true);
    expect(result.current.lockedStepMessage).toBe(
      'Already registered for this event. Verify another member.',
    );
    expect(result.current.memberIdHighlight).toBe(true);
  });

  it('returns not found when the lookup service does not return a profile', async () => {
    mockMutateAsync.mockResolvedValue({ profile: null, existing_registration: null });

    const { result } = renderHook(() => useMemberLookupState('sample-event'), {
      wrapper: createWrapper(),
    });

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-404' });
    });

    expect(outcome).toEqual({
      success: false,
      error: 'We could not verify that entry. Please contact your administrator for support.',
      reason: 'not_found',
    });
    expect(mockLoggerWarn).toHaveBeenCalled();
    expect(result.current.matchedMember).toBeNull();
  });

  it('resets state on lookup errors', async () => {
    mockMutateAsync.mockRejectedValue(new Error('lookup failed'));

    const onMemberCleared = vi.fn();
    const { result } = renderHook(() => useMemberLookupState('sample-event', onMemberCleared), {
      wrapper: createWrapper(),
    });

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-500' });
    });

    expect(outcome).toEqual({
      success: false,
      error: 'Lookup is unavailable right now. Please try again in a moment.',
      reason: 'lookup_unavailable',
    });
    expect(mockLoggerError).toHaveBeenCalled();
    expect(result.current.isRegistrationBlocked).toBe(false);
    expect(onMemberCleared).toHaveBeenCalledTimes(1);
  });

  it('clears state via reset and clearMember actions', async () => {
    const profile = makeMemberLookupProfile();
    mockMutateAsync.mockResolvedValue({
      profile,
      existing_registration: null,
    });

    const onMemberCleared = vi.fn();
    const { result } = renderHook(() => useMemberLookupState('sample-event', onMemberCleared), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'WC-001' });
    });

    act(() => {
      result.current.clearMember();
    });

    expect(result.current.matchedMember).toBeNull();
    expect(result.current.verifiedMemberCredential).toBeNull();
    expect(onMemberCleared).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.reset();
    });

    expect(onMemberCleared).toHaveBeenCalledTimes(3);

    await waitFor(() => {
      expect(result.current.lookupForm.getValues('memberId')).toBe('');
    });
  });

  it('handles formSlug lookup for new form submission', async () => {
    const profile = makeMemberLookupProfile();
    mockMutateAsync.mockResolvedValue({
      profile,
      existing_registration: null,
      existing_submission: null,
    });

    const { result } = renderHook(() => useMemberLookupState({ formSlug: 'volunteer-form' }), {
      wrapper: createWrapper(),
    });

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-002' });
    });

    expect(outcome).toEqual({ success: true, mode: 'new_registration' });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      memberId: 'WC-002',
      name: undefined,
      eventSlug: undefined,
      formSlug: 'volunteer-form',
    });
    expect(result.current.matchedMember?.full_name).toBe(profile.full_name);
    expect(result.current.isUpdateMode).toBe(false);
  });

  it('blocks duplicate form submissions when edit is not allowed', async () => {
    const profile = makeMemberLookupProfile();
    mockMutateAsync.mockResolvedValue({
      profile,
      existing_registration: null,
      existing_submission: {
        exists: true,
        edit_allowed: false,
        status: 'submitted',
        responses: { reason: 'Previous submission' },
      },
    });

    const { result } = renderHook(() => useMemberLookupState({ formSlug: 'survey-form' }), {
      wrapper: createWrapper(),
    });

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-003' });
    });

    expect(outcome).toEqual({
      success: false,
      error: 'You have already submitted this form.',
      reason: 'already_registered',
    });
    expect(result.current.isRegistrationBlocked).toBe(true);
    expect(result.current.lockedStepMessage).toBe(
      'Already submitted this form. Verify another member.',
    );
  });

  it('allows updating form submission when edit is allowed', async () => {
    const profile = makeMemberLookupProfile();
    mockMutateAsync.mockResolvedValue({
      profile,
      existing_registration: null,
      existing_submission: {
        exists: true,
        edit_allowed: true,
        status: 'submitted',
        responses: { notes: 'Existing answer' },
      },
    });

    const { result } = renderHook(() => useMemberLookupState({ formSlug: 'editable-form' }), {
      wrapper: createWrapper(),
    });

    const outcome = await act(async () => {
      return await result.current.handleLookupSubmit({ memberId: 'WC-004' });
    });

    expect(outcome).toEqual({ success: true, mode: 'update_registration' });
    expect(result.current.isUpdateMode).toBe(true);
    expect(result.current.prefillResponses).toEqual({ notes: 'Existing answer' });
  });
});
