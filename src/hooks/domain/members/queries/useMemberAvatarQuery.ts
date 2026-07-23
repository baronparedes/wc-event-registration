import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

const BUCKET = 'member_avatars';
const EXTENSIONS = ['jpg'] as const;

function toAvatarFilename(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

function resolvePublicUrl(name: string): string | null {
  const base = toAvatarFilename(name);

  for (const ext of EXTENSIONS) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${base}.${ext}`);

    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  return null;
}

export const memberAvatarQueryKey = (name: string) => ['member-avatar', name] as const;

export function useMemberAvatarQuery(name: string | undefined) {
  return useQuery({
    queryKey: name ? memberAvatarQueryKey(name) : ['member-avatar', 'missing'],
    enabled: Boolean(name),
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<string | null> => {
      if (!name) return null;
      return resolvePublicUrl(name);
    },
  });
}
