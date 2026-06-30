import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  enforcePublicRateLimit,
  isOriginAllowed,
  readAllowedOrigins,
} from '@/shared/security.ts'
import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts'

interface PublicRegistrationCheckRequest {
  email: string
  event_slug: string
}

interface PublicRegistrationCheckSuccess {
  success: true
  existing_registration?: {
    id: string
    status: string
    submitted_at: string
  }
}

interface PublicRegistrationCheckNotFound {
  success: false
  reason: 'not_found'
}

interface PublicRegistrationCheckError {
  success: false
  reason: 'validation_error' | 'internal_error'
  message: string
}

/**
 * Simple email validation.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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
    return new Response(JSON.stringify({ success: false, reason: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rateLimitResponse = enforcePublicRateLimit({
    req,
    origin,
    corsHeaders,
    scope: 'public-registration-check',
    windowMs: RATE_LIMIT_PRESETS.memberLookup.windowMs,
    maxHits: RATE_LIMIT_PRESETS.memberLookup.maxHits,
  })

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Validate environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'internal_error',
          message: 'Environment not configured',
        } as PublicRegistrationCheckError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse request
    const body = (await req.json()) as PublicRegistrationCheckRequest
    const { email, event_slug } = body

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'validation_error',
          message: 'Email is required',
        } as PublicRegistrationCheckError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!event_slug || typeof event_slug !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'validation_error',
          message: 'Event slug is required',
        } as PublicRegistrationCheckError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'validation_error',
          message: 'Invalid email address',
        } as PublicRegistrationCheckError),
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

    // Step 1: Look up event by slug
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', event_slug)
      .maybeSingle()

    if (eventError) {
      console.error('Event lookup error:', eventError)
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'internal_error',
          message: 'Failed to look up event',
        } as PublicRegistrationCheckError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // If event not found, return not_found (attendee hasn't registered yet)
    if (!eventData) {
      return new Response(
        JSON.stringify({ success: false, reason: 'not_found' } as PublicRegistrationCheckNotFound),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Step 2: Check for existing registration for this event + email
    const { data: regData, error: regError } = await supabase
      .from('public_registrations')
      .select('id, status, submitted_at')
      .eq('event_id', eventData.id)
      .ilike('email', email)
      .maybeSingle()

    if (regError) {
      console.error('Registration lookup error:', regError)
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'internal_error',
          message: 'Failed to look up registration',
        } as PublicRegistrationCheckError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const response: PublicRegistrationCheckSuccess = {
      success: true,
      ...(regData && {
        existing_registration: {
          id: regData.id,
          status: regData.status,
          submitted_at: regData.submitted_at,
        },
      }),
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'internal_error',
        message: 'An unexpected error occurred',
      } as PublicRegistrationCheckError),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
