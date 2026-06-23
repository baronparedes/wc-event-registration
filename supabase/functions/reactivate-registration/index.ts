import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
} from '../_shared/security.ts'

interface ReactivateRegistrationRequest {
  registration_id: string
}

interface ReactivateRegistrationSuccess {
  success: true
  registration_id: string
}

const allowedOrigins = readAllowedOrigins()

function maskValue(value: string | null, visible = 6): string {
  if (!value) return 'null'
  if (value.length <= visible * 2) return value
  return `${value.slice(0, visible)}...${value.slice(-visible)}`
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins)

  console.log('[reactivate-registration]', {
    requestId,
    method: req.method,
    origin,
    hasAuthorizationHeader: Boolean(req.headers.get('authorization')),
  })

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = req.headers.get('authorization')

    console.log('[reactivate-registration] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
    })

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

    const body = (await req.json()) as ReactivateRegistrationRequest
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

    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

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

    let userId: string | null = null
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        userId = payload.sub
      }
    } catch (e) {
      console.error('[reactivate-registration] failed to decode JWT', {
        requestId,
        error: e instanceof Error ? e.message : String(e),
      })
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

    const { data: adminRecord, error: adminCheckError } = await authClient
      .from('admins')
      .select('id')
      .eq('auth_user_id', userId)
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: registration, error: regFetchError } = await adminClient
      .from('registrations')
      .select('id, status')
      .eq('id', registration_id)
      .single()

    console.log('[reactivate-registration] registration fetch result', {
      requestId,
      registrationId: maskValue(registration_id),
      found: Boolean(registration),
      status: registration?.status ?? null,
      regFetchErrorCode: regFetchError?.code ?? null,
    })

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

    if (registration.status !== 'cancelled') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Registration is not cancelled',
          error_code: 'NOT_CANCELLED',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { error: updateError } = await adminClient
      .from('registrations')
      .update({
        status: 'updated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', registration_id)

    if (updateError) {
      console.error('[reactivate-registration] update error', {
        requestId,
        errorCode: updateError.code,
        errorMessage: updateError.message,
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to reactivate registration',
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
      } as ReactivateRegistrationSuccess),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('[reactivate-registration] unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
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
