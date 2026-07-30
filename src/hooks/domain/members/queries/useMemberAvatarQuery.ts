import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

const BUCKET = 'member_avatars';
function resolvePublicUrl(avatarObjectKey: string): string | null {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(avatarObjectKey);
  return data?.publicUrl ?? null;
}

export const memberAvatarQueryKey = (avatarObjectKey: string) =>
  ['member-avatar', avatarObjectKey] as const;

export function useMemberAvatarQuery(avatarObjectKey: string | null | undefined) {
  return useQuery({
    queryKey: avatarObjectKey
      ? memberAvatarQueryKey(avatarObjectKey)
      : ['member-avatar', 'missing'],
    enabled: Boolean(avatarObjectKey),
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<string | null> => {
      if (!avatarObjectKey) return null;
      return resolvePublicUrl(avatarObjectKey);
    },
  });
}
