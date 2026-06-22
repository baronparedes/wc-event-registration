import { supabase } from '../supabase'
import { validatePublicEventFieldConfig } from './configValidation'
import type {
  EventAvailability,
  EventFieldConfigValidationResult,
  MemberLookupProfile,
  PublicEvent,
  PublicEventFieldRow,
} from './types'

export async function fetchPublicEventBySlug(slug: string): Promise<EventAvailability> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, slug, title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at, registration_mode',
    )
    .eq('slug', slug)
    .maybeSingle<PublicEvent>()

  if (error) {
    throw error
  }

  if (!data) {
    return { status: 'unavailable', reason: 'not_found_or_unpublished' }
  }

  const now = Date.now()
  const opensAt = data.registration_opens_at ? Date.parse(data.registration_opens_at) : null
  const closesAt = data.registration_closes_at ? Date.parse(data.registration_closes_at) : null

  if (data.registration_mode !== 'open') {
    return { status: 'unavailable', reason: 'registration_closed', event: data }
  }

  if (opensAt !== null && now < opensAt) {
    return { status: 'unavailable', reason: 'not_open_yet', event: data }
  }

  if (closesAt !== null && now >= closesAt) {
    return { status: 'unavailable', reason: 'registration_closed', event: data }
  }

  return { status: 'available', event: data }
}

export async function fetchPublicEventFields(
  eventId: string,
): Promise<EventFieldConfigValidationResult> {
  const { data, error } = await supabase
    .from('event_fields')
    .select(
      'id, event_id, field_key, label, field_type, is_required, is_active, placeholder, help_text, options, validation_rules, display_order',
    )
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .returns<PublicEventFieldRow[]>()

  if (error) {
    throw error
  }

  return validatePublicEventFieldConfig(data ?? [])
}

export async function lookupMemberForRegistration(
  memberId: string,
): Promise<MemberLookupProfile | null> {
  const normalizedMemberId = memberId.trim()
  if (!normalizedMemberId) {
    return null
  }

  const { data, error } = await supabase.rpc('lookup_member_for_registration', {
    input_member_id: normalizedMemberId,
  })

  if (error) {
    throw error
  }

  const first = Array.isArray(data) ? data[0] : null
  if (!first) {
    return null
  }

  return first as MemberLookupProfile
}
