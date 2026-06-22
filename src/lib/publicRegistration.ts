import { supabase } from './supabase'

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

export type EventAvailability =
  | { status: 'available'; event: PublicEvent }
  | { status: 'unavailable'; reason: 'not_found_or_unpublished' }
  | { status: 'unavailable'; reason: 'not_open_yet'; event: PublicEvent }
  | { status: 'unavailable'; reason: 'registration_closed'; event: PublicEvent }

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
