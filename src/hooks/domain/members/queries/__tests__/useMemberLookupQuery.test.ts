import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeMemberLookupProfile } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useMemberLookupQuery } from '@/hooks/domain/members/queries/useMemberLookupQuery';

const { mockLookupCaller, mockCreateEdgeFunctionCaller, mockLogger } = vi.hoisted(() => {
  const lookupCaller = vi.fn();

  return {
    mockLookupCaller: lookupCaller,
    mockCreateEdgeFunctionCaller: vi.fn(() => lookupCaller),
    mockLogger: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
    logger: mockLogger,
  };
});

describe('useMemberLookupQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trims member id and returns profile result', async () => {
    const profile = makeMemberLookupProfile();
    mockLookupCaller.mockResolvedValueOnce({
      success: true,
      profile: { user_id: profile.user_id, member_id: profile.member_id },
      existing_registration: null,
    });

    const { result } = renderHookWithClient(() => useMemberLookupQuery());
    const slug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();

    const response = await act(async () =>
      result.current.mutateAsync({ memberId: `  ${profile.member_id}  `, eventSlug: slug }),
    );

    expect(mockLookupCaller).toHaveBeenCalledWith({
      memberId: profile.member_id,
      eventSlug: slug,
    });
    expect(response).toEqual({
      profile: { user_id: profile.user_id, member_id: profile.member_id },
      existing_registration: null,
    });
  });

  it('returns empty result when member id is blank', async () => {
    const { result } = renderHookWithClient(() => useMemberLookupQuery());

    const response = await act(async () => result.current.mutateAsync({ memberId: '   ' }));

    expect(mockLookupCaller).not.toHaveBeenCalled();
    expect(response).toEqual({
      profile: null,
      existing_registration: null,
    });
  });

  it('supports name-based lookup when member id is missing', async () => {
    const profile = makeMemberLookupProfile();
    mockLookupCaller.mockResolvedValueOnce({
      success: true,
      profile: { user_id: profile.user_id, member_id: profile.member_id },
      existing_registration: null,
    });

    const { result } = renderHookWithClient(() => useMemberLookupQuery());

    const response = await act(async () =>
      result.current.mutateAsync({ name: '  Juan Dela Cruz  ', eventSlug: 'sunday-service' }),
    );

    expect(mockLookupCaller).toHaveBeenCalledWith({
      memberId: undefined,
      name: 'Juan Dela Cruz',
      eventSlug: 'sunday-service',
    });
    expect(response).toEqual({
      profile: { user_id: profile.user_id, member_id: profile.member_id },
      existing_registration: null,
    });
  });

  it('surfaces error state when edge function throws', async () => {
    mockLookupCaller.mockRejectedValueOnce(new Error('lookup failed'));

    const { result } = renderHookWithClient(() => useMemberLookupQuery());

    await expect(result.current.mutateAsync({ memberId: 'WC-001' })).rejects.toThrow(
      'lookup failed',
    );

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
