import type { EventFieldType } from '../event-registration/types'

export type EventStatus = 'draft' | 'published' | 'archived'
export type DuplicatePolicy = 'block' | 'allow_update'
export type RegistrationMode = 'open' | 'closed'

export type AdminEvent = {
  id: string
  slug: string
  title: string
  description: string | null
  location: string | null
  starts_at: string | null
  ends_at: string | null
  registration_opens_at: string | null
  registration_closes_at: string | null
  status: EventStatus
  duplicate_policy: DuplicatePolicy
  require_id_lookup: boolean
  registration_mode: RegistrationMode
  metadata: Record<string, unknown>
  created_by_admin_id: string | null
  created_at: string
  updated_at: string
}

export type AdminEventFieldOption = {
  label: string
  value: string
}

export type AdminEventFieldValidationRules = {
  min_length?: number
  max_length?: number
  pattern?: string
  min?: number
  max?: number
  min_selections?: number
  max_selections?: number
  min_date?: string
  max_date?: string
}

export type AdminEventField = {
  id: string
  event_id: string
  field_key: string
  label: string
  field_type: EventFieldType
  is_required: boolean
  is_active: boolean
  placeholder: string | null
  help_text: string | null
  options: AdminEventFieldOption[]
  validation_rules: AdminEventFieldValidationRules
  display_order: number
  created_at: string
  updated_at: string
}

export type AdminAuditAction =
  | 'create_event'
  | 'update_event'
  | 'publish_event'
  | 'archive_event'
  | 'cancel_registration'
  | 'reactivate_registration'
  | 'export_registrations_csv'

export type AdminAuditResourceType = 'event' | 'registration' | 'export'
