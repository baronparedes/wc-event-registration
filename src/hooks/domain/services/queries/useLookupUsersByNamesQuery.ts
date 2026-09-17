import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export type LookupUserByNameResult = {
  id: string;
  member_id: string;
  full_name: string;
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

      const orFilter = normalizedNames
        .map((name) => `full_name.ilike.${escapeOrFilterValue(name)}`)
        .join(',');

      const { data, error } = await supabase
        .from('users')
        .select('id, member_id, full_name')
        .or(orFilter);

      if (error) {
        throw error;
      }

      return (data ?? []).map((u) => ({
        id: u.id,
        member_id: u.member_id,
        full_name: u.full_name,
      }));
    },
    enabled: normalizedNames.length > 0,
  });
}
