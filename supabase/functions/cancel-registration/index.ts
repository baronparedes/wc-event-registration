import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
} from '../_shared/security.ts'

interface CancelRegistrationRequest {
  registration_id: string
  reason?: string
}

interface CancelRegistrationSuccess {
  success: true
  registration_id: string
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
    const authHeader = req.headers.get('authorization')

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
    const body = (await req.json()) as CancelRegistrationRequest
    const { registration_id } = body

    if (!registration_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing registration_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Create authenticated client with user's token via Authorization header
    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Verify admin status by querying admins table - RLS will enforce access control
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Decode JWT to get user_id without validation (just extract)
    let userId: string | null = null
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        userId = payload.sub
      }
    } catch (e) {
      console.error('Failed to decode JWT:', e)
    }

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if user is admin using the authenticated client
    const { data: adminRecord, error: adminCheckError } = await authClient
      .from('admins')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (adminCheckError || !adminRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Create service role client for privileged operations after auth check
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch registration to verify it exists
    const { data: registration, error: regFetchError } = await adminClient
      .from('registrations')
      .select('id, status')
      .eq('id', registration_id)
      .single()

    if (regFetchError || !registration) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Registration not found',
          error_code: 'NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if already cancelled
    if (registration.status === 'cancelled') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Registration is already cancelled',
          error_code: 'ALREADY_CANCELLED',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Update registration status to cancelled
    const { error: updateError } = await adminClient
      .from('registrations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', registration_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to cancel registration',
          error_code: 'UPDATE_FAILED',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        registration_id,
      } as CancelRegistrationSuccess),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
