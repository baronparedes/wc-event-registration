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
    expect(memberAvatarQueryKey('avatars/member.jpg')).toEqual([
      'member-avatar',
      'avatars/member.jpg',
    ]);
    expect(memberAvatarQueryKey('avatars/member.jpg', 80)).toEqual([
      'member-avatar',
      'avatars/member.jpg',
      80,
    ]);
  });

  it('returns the public avatar URL for a valid object key', async () => {
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: 'https://example.com/avatars/member.jpg' },
    });

    const { result } = renderHookWithClient(() => useMemberAvatarQuery('avatars/member.jpg'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockStorageFrom).toHaveBeenCalledWith('member_avatars');
    expect(mockGetPublicUrl).toHaveBeenCalledWith('avatars/member.jpg');
    expect(result.current.data).toEqual({
      url: 'https://example.com/avatars/member.jpg',
      fallbackUrl: 'https://example.com/avatars/member.jpg',
    });
  });

  it('requests a high-quality transformed image and retains the original URL as fallback', async () => {
    mockGetPublicUrl
      .mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/avatars/member.jpg' },
      })
      .mockReturnValueOnce({
        data: {
          publicUrl: 'https://example.com/render/image/public/avatars/member.jpg?width=80',
        },
      });

    const { result } = renderHookWithClient(() => useMemberAvatarQuery('avatars/member.jpg', 80));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetPublicUrl).toHaveBeenNthCalledWith(1, 'avatars/member.jpg');
    expect(mockGetPublicUrl).toHaveBeenNthCalledWith(2, 'avatars/member.jpg', {
      transform: {
        width: 80,
        height: 80,
        resize: 'cover',
        quality: 90,
      },
    });
    expect(result.current.data).toEqual({
      url: 'https://example.com/render/image/public/avatars/member.jpg?width=80',
      fallbackUrl: 'https://example.com/avatars/member.jpg',
    });
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
