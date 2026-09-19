export type AdminAuditAction =
  | 'create_event'
  | 'update_event'
  | 'publish_event'
  | 'archive_event'
  | 'cancel_registration'
  | 'reactivate_registration'
  | 'export_registrations_csv'
  | 'create_form';

export type AdminAuditResourceType = 'event' | 'registration' | 'export' | 'form';

export interface AdminAuditPayload {
  action: AdminAuditAction;
  resourceType: AdminAuditResourceType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}
