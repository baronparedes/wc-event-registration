export type MemberLookupProfile = {
  user_id: string
  full_name: string
  nickname: string | null
  first_name: string | null
  last_name: string | null
}

export type ExistingRegistrationState = {
  exists: boolean
  edit_allowed: boolean
  status: 'submitted' | 'updated' | 'cancelled'
  responses: Record<string, unknown>
}

export type MemberLookupResult = {
  profile: MemberLookupProfile | null
  existing_registration: ExistingRegistrationState | null
}
