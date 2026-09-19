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
  | 'restore_member';

export type AdminAuditResourceType = 'event' | 'registration' | 'export' | 'form' | 'member';

export interface AdminAuditPayload {
  action: AdminAuditAction;
  resourceType: AdminAuditResourceType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}
