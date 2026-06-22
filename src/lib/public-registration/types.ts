export type PublicEvent = {
  id: string
  slug: string
  title: string
  description: string | null
  location: string | null
  starts_at: string | null
  ends_at: string | null
  registration_opens_at: string | null
  registration_closes_at: string | null
  registration_mode: 'open' | 'closed'
}

export type MemberLookupProfile = {
  user_id: string
  full_name: string
  nickname: string | null
  first_name: string | null
  last_name: string | null
}

export type EventFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multi_select'
  | 'date'
  | 'datetime'
  | 'boolean'

export type PublicEventFieldOption = {
  label: string
  value: string
}

export type PublicEventFieldValidationRules = {
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

export type PublicEventField = {
  id: string
  event_id: string
  field_key: string
  label: string
  field_type: EventFieldType
  is_required: boolean
  is_active: boolean
  placeholder: string | null
  help_text: string | null
  options: PublicEventFieldOption[]
  validation_rules: PublicEventFieldValidationRules
  display_order: number
}

export type PublicEventFieldRow = Omit<PublicEventField, 'options' | 'validation_rules'> & {
  options: unknown
  validation_rules: unknown
}

export type EventFieldConfigValidationResult = {
  validFields: PublicEventField[]
  issues: string[]
}

export type EventAvailability =
  | { status: 'available'; event: PublicEvent }
  | { status: 'unavailable'; reason: 'not_found_or_unpublished' }
  | { status: 'unavailable'; reason: 'not_open_yet'; event: PublicEvent }
  | { status: 'unavailable'; reason: 'registration_closed'; event: PublicEvent }

export type DynamicFieldResponseValues = Record<string, unknown>

export type DynamicFieldAnswerPreview = {
  event_field_id: string
  field_key: string
  field_type: EventFieldType
  value: unknown
}
