import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateMemberInput } from '@/lib/domain/members';
import { supabase } from '@/lib/infrastructure';

import { ADMIN_MEMBER_QUERY_KEY } from '../queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

interface UserRecord {
  metadata: Record<string, unknown> | null;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildMetadata(previousMetadata: Record<string, unknown> | null, input: UpdateMemberInput) {
  const nextMetadata = { ...(previousMetadata ?? {}) };

  delete nextMetadata.role;
  delete nextMetadata.category;

  // Remove stale extra keys before writing new entries
  const incomingKeys = new Set(
    (input.metadata_entries ?? []).map((e) => e.key.trim()).filter(Boolean),
  );
  for (const key of Object.keys(nextMetadata)) {
    if (!incomingKeys.has(key)) {
      delete nextMetadata[key];
    }
  }

  for (const entry of input.metadata_entries ?? []) {
    const key = entry.key.trim();
    if (key) {
      nextMetadata[key] = entry.value.trim();
    }
  }

  return nextMetadata;
}

/** Updates an existing member record and refreshes admin member caches. */
export function useUpdateMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateMemberInput): Promise<void> => {
      const { data: existingMember, error: readError } = await supabase
        .from('users')
        .select('metadata')
        .eq('id', id)
        .maybeSingle();

      if (readError) throw readError;
      if (!existingMember) throw new Error('Member not found');

      const nextValues = {
        full_name: input.full_name.trim(),
        first_name: emptyToNull(input.first_name),
        last_name: emptyToNull(input.last_name),
        nickname: emptyToNull(input.nickname),
        email: emptyToNull(input.email),
        phone: emptyToNull(input.phone),
        date_of_birth: emptyToNull(input.date_of_birth),
        role: input.role.trim(),
        category: input.category.trim(),
        metadata: buildMetadata((existingMember as UserRecord).metadata, input),
      };

      const { error: updateError } = await supabase.from('users').update(nextValues).eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_QUERY_KEY(id) });
    },
  });
}
