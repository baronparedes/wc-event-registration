import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
} from '../_shared/security.ts'

interface MemberLookupRequest {
  memberId: string
  eventSlug?: string
}

interface MemberLookupProfile {
  user_id: string
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

interface MemberLookupResponse {
  success: true
  profile: MemberLookupProfile | null
  existing_registration: ExistingRegistrationState | null
}

const allowedOrigins = readAllowedOrigins()

Deno.serve(async (req) => {
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
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Validate environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Environment not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse and validate request
    const body = (await req.json()) as MemberLookupRequest
    const { memberId, eventSlug } = body

    if (!memberId || typeof memberId !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request: memberId is required and must be a string',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Normalize input (match existing RPC behavior)
    const normalizedMemberId = memberId.trim()
    if (!normalizedMemberId) {
      return new Response(
        JSON.stringify({ success: true, profile: null, existing_registration: null }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (eventSlug !== undefined && typeof eventSlug !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request: eventSlug must be a string when provided',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const normalizedEventSlug = eventSlug?.trim()

    if (eventSlug !== undefined && !normalizedEventSlug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request: eventSlug cannot be blank',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Create authenticated client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Query users table directly for member lookup
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, nickname, first_name, last_name')
      .eq('member_id', normalizedMemberId)
      .maybeSingle()

    if (error) {
      console.error('Query error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to lookup member',
          detail: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Transform response: rename id to user_id to match expected shape
    const profile = data
      ? ({
          user_id: data.id,
          full_name: data.full_name,
          nickname: data.nickname,
          first_name: data.first_name,
          last_name: data.last_name,
        } as MemberLookupProfile)
      : null

    if (!profile || !normalizedEventSlug) {
      return new Response(
        JSON.stringify({
          success: true,
          profile,
          existing_registration: null,
        } as MemberLookupResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, duplicate_policy')
      .eq('slug', normalizedEventSlug)
      .maybeSingle()

    if (eventError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to lookup event',
          detail: eventError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!eventData) {
      return new Response(
        JSON.stringify({
          success: true,
          profile,
          existing_registration: null,
        } as MemberLookupResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: existingRegistration, error: registrationError } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('event_id', eventData.id)
      .eq('user_id', profile.user_id)
      .maybeSingle()

    if (registrationError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to lookup existing registration',
          detail: registrationError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!existingRegistration) {
      return new Response(
        JSON.stringify({
          success: true,
          profile,
          existing_registration: null,
        } as MemberLookupResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: answerRows, error: answersError } = await supabase
      .from('registration_answers')
      .select(
        'answer_text, answer_number, answer_boolean, answer_date, answer_json, event_fields!inner(field_key)',
      )
      .eq('registration_id', existingRegistration.id)

    if (answersError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to load registration answers',
          detail: answersError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const responses: Record<string, unknown> = {}
    for (const row of answerRows ?? []) {
      const fieldKey = (row.event_fields as { field_key: string } | null)?.field_key
      if (!fieldKey) continue

      let value: unknown = null

      if (row.answer_json !== null) {
        value = row.answer_json
      } else if (row.answer_boolean !== null) {
        value = row.answer_boolean
      } else if (row.answer_number !== null) {
        value = row.answer_number
      } else if (row.answer_date !== null) {
        value = row.answer_date
      } else if (row.answer_text !== null) {
        try {
          value = JSON.parse(row.answer_text)
        } catch {
          value = row.answer_text
        }
      }

      if (value !== null) {
        responses[fieldKey] = value
      }
    }

    const existingRegistrationState: ExistingRegistrationState = {
      exists: true,
      edit_allowed: eventData.duplicate_policy === 'allow_update',
      status: existingRegistration.status,
      responses,
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        existing_registration: existingRegistrationState,
      } as MemberLookupResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        detail: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
