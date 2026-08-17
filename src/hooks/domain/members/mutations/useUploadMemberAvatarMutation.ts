import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_MEMBER_QUERY_KEY } from '../queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';
import { memberAvatarQueryKey } from '../queries/useMemberAvatarQuery';

interface UploadMemberAvatarRequest {
  id: string;
  image_base64: string;
}

interface UploadMemberAvatarResponse {
  success: true;
  avatar_object_key: string;
}

const callUploadMemberAvatar = createEdgeFunctionCaller<
  UploadMemberAvatarRequest,
  UploadMemberAvatarResponse
>('upload-member-avatar');

export function useUploadMemberAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callUploadMemberAvatar,
    onSuccess: ({ avatar_object_key }, { id, image_base64 }) => {
      queryClient.setQueryData(memberAvatarQueryKey(avatar_object_key), image_base64);
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_QUERY_KEY(id) });
    },
  });
}
