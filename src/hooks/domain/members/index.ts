// Queries
export { useMemberLookupQuery } from './queries/useMemberLookupQuery';
export { useAdminMembersQuery } from './queries/useAdminMembersQuery';
export { useAdminMembersMilestonesQuery } from './queries/useAdminMembersMilestonesQuery';
export { useAdminMembersSchedulesQuery } from './queries/useAdminMembersSchedulesQuery';
export type {
  MemberScheduleEntry,
  TimeSlot,
  SundayKey,
} from './queries/useAdminMembersSchedulesQuery';
export { useAdminMemberQuery } from './queries/useAdminMemberQuery';
export { useAdminMembersImportSnapshotQuery } from './queries/useAdminMembersImportSnapshotQuery';
export { useMemberAvatarQuery } from './queries/useMemberAvatarQuery';
export { useMemberEventHistoryQuery } from './queries/useMemberEventHistoryQuery';
export {
  useCurrentProfileQuery,
  CURRENT_PROFILE_QUERY_KEY,
} from './queries/useCurrentProfileQuery';
export { useGetExcusedMembers } from './queries/useGetExcusedMembers';
export type { ExcusedMemberRecord } from './queries/useGetExcusedMembers';
export { useGetMemberExcusedSchedule } from './queries/useGetMemberExcusedSchedule';

// Mutations
export { useUpdateMemberMutation } from './mutations/useUpdateMemberMutation';
export { useUpdateMemberIdMutation } from './mutations/useUpdateMemberIdMutation';
export { useCreateMemberMutation } from './mutations/useCreateMemberMutation';
export { useBulkUpsertMembersMutation } from './mutations/useBulkUpsertMembersMutation';
export { useSoftDeleteMemberMutation } from './mutations/useSoftDeleteMemberMutation';
export { useRestoreMemberMutation } from './mutations/useRestoreMemberMutation';
export { useUploadMemberAvatarMutation } from './mutations/useUploadMemberAvatarMutation';

// State
export {
  useMemberLookupState,
  type MemberLookupState,
  type MemberLookupActions,
} from './state/useMemberLookupState';

// Domain types re-exported for convenience
export type {
  MemberLookupProfile,
  MemberLookupResult,
  ExistingRegistrationState,
  AdminMember,
} from '@/lib/domain/members';
