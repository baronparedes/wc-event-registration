import type { EventFieldType } from '@/lib/domain/event-fields'

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
  allow_public_registrations: boolean
  metadata: Record<string, unknown>
  created_by_admin_id: string | null
  created_at: string
  updated_at: string
}

export type EventAvailability =
  | { status: 'available'; event: AdminEvent; registration_count: number }
  | { status: 'unavailable'; reason: 'not_found_or_unpublished' }
  | { status: 'unavailable'; reason: 'not_open_yet'; event: AdminEvent }
  | { status: 'unavailable'; reason: 'registration_closed'; event: AdminEvent }

export type PublicEventListingItem = {
  id: string
  slug: string
  title: string
  description: string | null
  location: string | null
  starts_at: string | null
  ends_at: string | null
  registration_opens_at: string | null
  registration_closes_at: string | null
  listingStatus: 'open' | 'upcoming' | 'past'
}

export type DynamicFieldAnswerPreview = {
  event_field_id: string
  field_key: string
  field_type: EventFieldType
  value: unknown
}
