export type AdminAuditAction =
  | 'create_event'
  | 'update_event'
  | 'publish_event'
  | 'archive_event'
  | 'cancel_registration'
  | 'reactivate_registration'
  | 'export_registrations_csv'
  | 'create_form'
  | 'update_form'
  | 'create_member'
  | 'update_member'
  | 'soft_delete_member'
  | 'restore_member'
  | 'assign_admin_role'
  | 'update_admin_role'
  | 'revoke_admin_role';

export type AdminAuditResourceType =
  | 'event'
  | 'registration'
  | 'export'
  | 'form'
  | 'member'
  | 'admin_role';

export interface AdminAuditPayload {
  action: AdminAuditAction;
  resourceType: AdminAuditResourceType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}
