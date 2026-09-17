import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export type LookupUserByNameResult = {
  id: string;
  member_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export const lookupUsersByNamesQueryKey = (names: string[]) =>
  [
    'lookup-users-by-names',
    [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))].sort(),
  ] as const;

export function useLookupUsersByNamesQuery(names: string[]) {
  const normalizedNames = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean))).sort();

  return useQuery({
    queryKey: lookupUsersByNamesQueryKey(normalizedNames),
    queryFn: async (): Promise<LookupUserByNameResult[]> => {
      if (normalizedNames.length === 0) {
        return [];
      }

      const filters: string[] = [];
      for (const name of normalizedNames) {
        const escapedName = escapeOrFilterValue(name);
        filters.push(`full_name.ilike.${escapedName}`);

        const tokens = name.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
          const first = escapeOrFilterValue(tokens[0]);
          const last = escapeOrFilterValue(tokens.slice(1).join(' '));
          const lastToken = escapeOrFilterValue(tokens[tokens.length - 1]);
          filters.push(`and(nickname.ilike.${first},last_name.ilike.${last})`);
          if (last !== lastToken) {
            filters.push(`and(nickname.ilike.${first},last_name.ilike.${lastToken})`);
            const firstTwo = escapeOrFilterValue(tokens.slice(0, 2).join(' '));
            filters.push(`and(nickname.ilike.${firstTwo},last_name.ilike.${lastToken})`);
          }
        } else if (tokens.length === 1) {
          const single = escapeOrFilterValue(tokens[0]);
          filters.push(`nickname.ilike.${single}`);
          filters.push(`last_name.ilike.${single}`);
        }
      }

      const orFilter = Array.from(new Set(filters)).join(',');

      const { data, error } = await supabase
        .from('users')
        .select('id, member_id, full_name, first_name, last_name, nickname')
        .or(orFilter);

      if (error) {
        throw error;
      }

      return (data ?? []).map((u) => ({
        id: u.id,
        member_id: u.member_id,
        full_name: u.full_name,
        first_name: u.first_name ?? null,
        last_name: u.last_name ?? null,
        nickname: u.nickname ?? null,
      }));
    },
    enabled: normalizedNames.length > 0,
  });
}
