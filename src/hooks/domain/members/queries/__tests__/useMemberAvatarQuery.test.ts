import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import {
  memberAvatarQueryKey,
  useMemberAvatarQuery,
} from '@/hooks/domain/members/queries/useMemberAvatarQuery';

const { mockGetPublicUrl, mockStorageFrom } = vi.hoisted(() => {
  const getPublicUrl = vi.fn();

  return {
    mockGetPublicUrl: getPublicUrl,
    mockStorageFrom: vi.fn(() => ({
      getPublicUrl,
    })),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      storage: {
        from: mockStorageFrom,
      },
    },
  };
});

describe('useMemberAvatarQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports a stable query key factory', () => {
    expect(memberAvatarQueryKey('avatars/jane.jpg')).toEqual(['member-avatar', 'avatars/jane.jpg']);
  });

  it('returns the public avatar URL for a valid object key', async () => {
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: 'https://example.com/avatars/jane.jpg' },
    });

    const { result } = renderHookWithClient(() => useMemberAvatarQuery('avatars/jane.jpg'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockStorageFrom).toHaveBeenCalledWith('member_avatars');
    expect(mockGetPublicUrl).toHaveBeenCalledWith('avatars/jane.jpg');
    expect(result.current.data).toBe('https://example.com/avatars/jane.jpg');
  });

  it('returns null when the storage response has no public URL', async () => {
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: null },
    });

    const { result } = renderHookWithClient(() => useMemberAvatarQuery('avatars/missing.jpg'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('stays idle when the avatar object key is missing', () => {
    const { result } = renderHookWithClient(() => useMemberAvatarQuery(undefined));

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });

  it('returns null on refetch when the avatar object key is missing', async () => {
    const { result } = renderHookWithClient(() => useMemberAvatarQuery(undefined));

    const response = await result.current.refetch();

    expect(response.data).toBeNull();
    expect(response.error).toBeNull();
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });
});
