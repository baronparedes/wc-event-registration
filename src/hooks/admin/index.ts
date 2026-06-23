// Auth
export {
  ADMIN_AUTH_QUERY_KEY,
  type AdminAuthState,
  useAdminAuthQuery,
  useAdminLoginMutation,
  useAdminLogoutMutation,
} from './auth'

// Events
export {
  ADMIN_EVENTS_QUERY_KEY,
  useAdminEventsQuery,
  adminEventQueryKey,
  useAdminEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  usePublishEventMutation,
  type PublishValidationError,
  useArchiveEventMutation,
} from './events'

// Fields
export {
  adminEventFieldsQueryKey,
  useAdminEventFieldsQuery,
  useCreateEventFieldMutation,
  useUpdateEventFieldMutation,
  useDeleteEventFieldMutation,
  useReorderEventFieldsMutation,
} from './fields'

// Shared utilities
export { useSlugGeneration, useSaveConfirmation, type SaveConfirmationState } from '../utils'
