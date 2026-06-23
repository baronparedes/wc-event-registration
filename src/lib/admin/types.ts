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
