export {
  ADMIN_AUTH_QUERY_KEY,
  canAdminPerform,
  type AdminAuthState,
  type AdminRole,
  type AssignableAdminRole,
  type AdminRoleAssignment,
  type AuthUserItem,
} from '@/lib/domain/auth';
export { useAdminAuthQuery } from './useAdminAuthQuery';
export { useAdminLoginMutation } from './useAdminLoginMutation';
export { useAdminLogoutMutation } from './useAdminLogoutMutation';
export { useGoogleLoginMutation } from './useGoogleLoginMutation';
export { useAdminRolesQuery, ADMIN_ROLES_QUERY_KEY } from './useAdminRolesQuery';
export { useAuthUsersQuery, AUTH_USERS_QUERY_KEY } from './useAuthUsersQuery';
export {
  useManageAdminRoleMutation,
  type ManageAdminRoleVariables,
} from './useManageAdminRoleMutation';
