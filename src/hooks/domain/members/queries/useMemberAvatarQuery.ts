import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

const BUCKET = 'member_avatars';

export interface MemberAvatarSources {
  url: string;
  fallbackUrl: string;
}

function resolvePublicUrls(
  avatarObjectKey: string,
  transformWidth?: number,
): MemberAvatarSources | null {
  const storage = supabase.storage.from(BUCKET);
  const { data: original } = storage.getPublicUrl(avatarObjectKey);
  const originalUrl = original?.publicUrl;
  if (!originalUrl) return null;

  if (!transformWidth) {
    return { url: originalUrl, fallbackUrl: originalUrl };
  }

  const { data: transformed } = storage.getPublicUrl(avatarObjectKey, {
    transform: {
      width: transformWidth,
      height: transformWidth,
      resize: 'cover',
      quality: 90,
    },
  });

  return {
    url: transformed?.publicUrl ?? originalUrl,
    fallbackUrl: originalUrl,
  };
}

export const memberAvatarQueryKey = (avatarObjectKey: string, transformWidth?: number) =>
  transformWidth
    ? (['member-avatar', avatarObjectKey, transformWidth] as const)
    : (['member-avatar', avatarObjectKey] as const);

export function useMemberAvatarQuery(
  avatarObjectKey: string | null | undefined,
  transformWidth?: number,
) {
  return useQuery({
    queryKey: avatarObjectKey
      ? memberAvatarQueryKey(avatarObjectKey, transformWidth)
      : ['member-avatar', 'missing', transformWidth],
    enabled: Boolean(avatarObjectKey),
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<MemberAvatarSources | null> => {
      if (!avatarObjectKey) return null;
      return resolvePublicUrls(avatarObjectKey, transformWidth);
    },
  });
}
