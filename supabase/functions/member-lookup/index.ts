import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  enforcePublicRateLimit,
  isOriginAllowed,
  readAllowedOrigins,
} from '@/shared/security.ts'
import {
  errorResponse as sharedErrorResponse,
  successResponse as sharedSuccessResponse,
} from '@/shared/http.ts'
import { tryConvertRfidInput } from '@/shared/rfid.ts'

interface MemberLookupRequest {
  memberId?: string
  name?: string
  eventSlug?: string
}

interface MemberLookupProfile {
  user_id: string
  member_id: string
  full_name: string
  nickname: string | null
  first_name: string | null
  last_name: string | null
}

interface ExistingRegistrationState {
  exists: boolean
  edit_allowed: boolean
  status: 'submitted' | 'updated' | 'cancelled'
  responses: Record<string, unknown>
}

type AnswerRow = {
  answer_text: string | null
  answer_number: number | null
  answer_boolean: boolean | null
  answer_date: string | null
  answer_json: unknown | null
  event_fields: { field_key: string } | { field_key: string }[] | null
}

type UserLookupRow = {
  id: string
  member_id: string
  full_name: string
  nickname: string | null
  first_name: string | null
  last_name: string | null
}

type EventLookupRow = {
  id: string
  duplicate_policy: string
  metadata: unknown
}

type ExistingRegistrationLookupResult = {
  data: ExistingRegistrationState | null
  error: string | null
}

function normalizeName(value: string | null | undefined) {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function toProfile(row: UserLookupRow | null): MemberLookupProfile | null {
  if (!row) return null
  return {
    user_id: row.id,
    member_id: row.member_id,
    full_name: row.full_name,
    nickname: row.nickname,
    first_name: row.first_name,
    last_name: row.last_name,
  }
}

function getAnswerValue(row: AnswerRow): unknown {
  if (row.answer_json !== null) return row.answer_json
  if (row.answer_boolean !== null) return row.answer_boolean
  if (row.answer_number !== null) return row.answer_number
  if (row.answer_date !== null) return row.answer_date
  if (row.answer_text !== null) {
    try {
      return JSON.parse(row.answer_text)
    } catch {
      return row.answer_text
    }
  }
  return null
}

function getFieldKey(eventFields: AnswerRow['event_fields']): string | null {
  if (!eventFields) return null
  if (Array.isArray(eventFields)) {
    return eventFields[0]?.field_key ?? null
  }
  return eventFields.field_key ?? null
}

function mapAnswerRowsToResponses(rows: AnswerRow[] | null | undefined): Record<string, unknown> {
  const responses: Record<string, unknown> = {}
  for (const row of rows ?? []) {
    const fieldKey = getFieldKey(row.event_fields)
    if (!fieldKey) continue

    const value = getAnswerValue(row)
    if (value !== null) {
      responses[fieldKey] = value
    }
  }
  return responses
}

async function findUserByNameOrNickname(
  baseQuery: ReturnType<ReturnType<typeof createClient>['from']>,
  normalizedSearchValue: string,
) {
  const { data: users, error } = await baseQuery
    .not('last_name', 'is', null)
    .or('first_name.not.is.null,nickname.not.is.null')

  if (error) {
    return { data: null as UserLookupRow | null, error: error.message }
  }

  const matches = (users ?? []).filter((user) => {
    const firstNameWithLastName = normalizeName(`${user.first_name ?? ''} ${user.last_name ?? ''}`)
    const nicknameWithLastName = normalizeName(`${user.nickname ?? ''} ${user.last_name ?? ''}`)
    return (
      firstNameWithLastName.includes(normalizedSearchValue) ||
      nicknameWithLastName.includes(normalizedSearchValue)
    )
  })

  return {
    data: matches.length === 1 ? (matches[0] as UserLookupRow) : null,
    error: null,
  }
}

async function getEventBySlug(
  supabase: ReturnType<typeof createClient>,
  slug: string,
): Promise<{ data: EventLookupRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .select('id, duplicate_policy, metadata')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as EventLookupRow | null, error: null }
}

async function getExistingRegistrationState(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  userId: string,
  duplicatePolicy: string,
): Promise<ExistingRegistrationLookupResult> {
  const { data: existingRegistration, error: registrationError } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (registrationError) {
    return { data: null, error: `registration_lookup:${registrationError.message}` }
  }

  if (!existingRegistration) {
    return { data: null, error: null }
  }

  const { data: answerRows, error: answersError } = await supabase
    .from('registration_answers')
    .select(
      'answer_text, answer_number, answer_boolean, answer_date, answer_json, event_fields!inner(field_key)',
    )
    .eq('registration_id', existingRegistration.id)

  if (answersError) {
    return { data: null, error: `answers_lookup:${answersError.message}` }
  }

  const responses = mapAnswerRowsToResponses((answerRows as AnswerRow[] | null) ?? null)

  return {
    data: {
      exists: true,
      edit_allowed: duplicatePolicy === 'allow_update',
      status: existingRegistration.status,
      responses,
    },
    error: null,
  }
}

const allowedOrigins = readAllowedOrigins()

Deno.serve(async (req) => {
  // Step 1: Validation and Gates
  // 1.1 Build request context and CORS headers.
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return createObscuredDenyResponse(corsHeaders)
    }

    return new Response('ok', { headers: corsHeaders })
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return createObscuredDenyResponse(corsHeaders)
  }

  if (req.method !== 'POST') {
    return sharedErrorResponse(corsHeaders, 405, 'Method not allowed')
  }

  const rateLimitResponse = enforcePublicRateLimit({
    req,
    origin,
    corsHeaders,
    scope: 'member-lookup',
    windowMs: 60_000,
    maxHits: 60,
  })

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // 1.2 Validate runtime environment.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return sharedErrorResponse(corsHeaders, 500, 'Environment not configured')
    }

    // 1.3 Parse payload and validate request input.
    const body = (await req.json()) as MemberLookupRequest
    const { memberId, name, eventSlug } = body

    // Infer lookup type from which field is provided
    // Prefer memberId if both are provided; otherwise use name
    const isIdLookup = Boolean(memberId?.trim())
    const isNameLookup = !isIdLookup && Boolean(name?.trim())

    // Validate that at least one search field is provided
    if (!isIdLookup && !isNameLookup) {
      return sharedErrorResponse(
        corsHeaders,
        400,
        'Invalid request: either memberId or name must be provided',
      )
    }

    if (eventSlug !== undefined && typeof eventSlug !== 'string') {
      return sharedErrorResponse(
        corsHeaders,
        400,
        'Invalid request: eventSlug must be a string when provided',
      )
    }

    const normalizedEventSlug = eventSlug?.trim()

    if (eventSlug !== undefined && !normalizedEventSlug) {
      return sharedErrorResponse(corsHeaders, 400, 'Invalid request: eventSlug cannot be blank')
    }

    // 1.4 Create Supabase service-role client.
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 1.5 Preload event context when eventSlug is provided.
    let eventData: EventLookupRow | null = null

    if (normalizedEventSlug) {
      const eventResult = await getEventBySlug(supabase, normalizedEventSlug)

      if (eventResult.error) {
        return sharedErrorResponse(corsHeaders, 500, 'Failed to lookup event', eventResult.error)
      }

      eventData = eventResult.data
    }

    // 1.6 Enforce event name-lookup policy before running name search.
    if (isNameLookup && normalizedEventSlug) {
      if (!eventData) {
        return sharedSuccessResponse(
          corsHeaders,
          { profile: null, existing_registration: null },
          200,
        )
      }

      const eventMetadata = (eventData.metadata ?? {}) as Record<string, unknown>
      const allowNameLookup = eventMetadata.allow_name_lookup === true
      if (!allowNameLookup) {
        return sharedSuccessResponse(
          corsHeaders,
          { profile: null, existing_registration: null },
          200,
        )
      }
    }

    // Step 2: Member Lookup
    // 2.1 Lookup member by member_id or name/nickname.
    // For ID lookups, automatically detect and convert Big-Endian RFID hex input to decimal.
    const searchValue = isIdLookup ? tryConvertRfidInput(memberId!.trim()) : name!.trim()
    const baseQuery = supabase
      .from('users')
      .select('id, member_id, full_name, nickname, first_name, last_name')
    let filteredData: UserLookupRow | null = null

    if (isIdLookup) {
      const { data } = await baseQuery.eq('member_id', searchValue).maybeSingle()
      filteredData = data
    } else {
      const normalizedSearchValue = normalizeName(searchValue)
      const lookupResult = await findUserByNameOrNickname(baseQuery, normalizedSearchValue)
      if (lookupResult.error) {
        console.error('Query error:', lookupResult.error)
        return sharedErrorResponse(corsHeaders, 500, 'Failed to lookup member', lookupResult.error)
      }
      filteredData = lookupResult.data
    }

    // 2.2 Map DB row to API profile shape and early-return when no profile/event.
    const profile = toProfile(filteredData)

    if (!profile || !normalizedEventSlug) {
      return sharedSuccessResponse(corsHeaders, { profile, existing_registration: null }, 200)
    }

    if (!eventData) {
      return sharedSuccessResponse(corsHeaders, { profile, existing_registration: null }, 200)
    }

    // Step 3: Registration Lookup
    // 3.1 Resolve registration outcome (not registered vs already registered).
    const registrationResult = await getExistingRegistrationState(
      supabase,
      eventData.id,
      profile.user_id,
      eventData.duplicate_policy,
    )

    if (registrationResult.error) {
      if (registrationResult.error.startsWith('registration_lookup:')) {
        return sharedErrorResponse(
          corsHeaders,
          500,
          'Failed to lookup existing registration',
          registrationResult.error.replace('registration_lookup:', ''),
        )
      }

      return sharedErrorResponse(
        corsHeaders,
        500,
        'Failed to load registration answers',
        registrationResult.error.replace('answers_lookup:', ''),
      )
    }

    // 3.2 Return successful lookup with registration state (or null when not registered).
    return sharedSuccessResponse(
      corsHeaders,
      { profile, existing_registration: registrationResult.data },
      200,
    )
  } catch (error) {
    // 3.3 Return safe internal error response for unexpected failures.
    console.error('Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'

    return sharedErrorResponse(corsHeaders, 500, 'Internal server error', message)
  }
})
