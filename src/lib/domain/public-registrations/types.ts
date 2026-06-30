/**
 * Public attendee and registration types
 * Defines the domain model for non-member event registrants
 */

export type RegistrationStatus = 'submitted' | 'updated' | 'cancelled'

export interface PublicRegistration {
  id: string
  event_id: string
  first_name: string
  last_name: string
  nickname: string | null
  email: string
  phone: string | null
  status: RegistrationStatus
  idempotency_key: string | null
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface PublicRegistrationSummary {
  id: string
  first_name: string
  last_name: string
  nickname: string | null
  email: string
  phone: string | null
  status: RegistrationStatus
  submitted_at: string
}

export interface PublicRegistrationAnswer {
  id: string
  public_registration_id: string
  event_field_id: string
  answer_text: string | null
  answer_number: number | null
  answer_boolean: boolean | null
  answer_date: string | null
  answer_json: unknown | null
  created_at: string
  updated_at: string
}

/**
 * Request/Response types for Edge Functions
 */

export interface PublicAttendeeInfo {
  first_name: string
  nickname?: string | null
  last_name: string
  email: string
  phone?: string | null
}

export interface SubmitPublicRegistrationRequest {
  event_slug: string
  attendee: PublicAttendeeInfo
  responses: Record<string, unknown>
  idempotency_key: string
}

export type SubmitPublicRegistrationResult =
  | {
      success: true
      registration_id: string
      status: RegistrationStatus
    }
  | {
      success: false
      error:
        | 'event_not_found'
        | 'public_registration_not_allowed'
        | 'registration_closed'
        | 'duplicate_registration'
        | 'validation_error'
        | 'internal_error'
      message: string
    }

export interface PublicRegistrationCheckResult {
  success: true
  existing_registration?: {
    id: string
    status: RegistrationStatus
    submitted_at: string
  }
}

export interface PublicRegistrationNotFoundResult {
  success: false
  reason: 'not_found'
}

export interface CancelPublicRegistrationRequest {
  registration_id: string
  reason?: string
}

export type CancelPublicRegistrationResult =
  | {
      success: true
      registration_id: string
    }
  | {
      success: false
      error: 'registration_not_found' | 'already_cancelled' | 'internal_error'
      error_code?: string
    }
