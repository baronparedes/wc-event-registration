import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  logAdminAction,
  requireAdminAccess,
  readAllowedOrigins,
} from '@/shared/security.ts'
import { errorResponse, jsonResponse } from '@/shared/http.ts'
import { parseFunctionEnvironment, parseRequestBody, z } from '@/shared/validation.ts'

const reactivatePublicRegistrationRequestSchema = z.object({
  registration_id: z.string().uuid('registration_id must be a valid UUID'),
})

type AdminReactivatePublicRegistrationRequest = z.infer<
  typeof reactivatePublicRegistrationRequestSchema
>

type AdminReactivatePublicRegistrationSuccess = {
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

  console.log('[reactivate-public-registration]', {
    requestId,
    method: req.method,
    origin,
    hasAuthorizationHeader: Boolean(req.headers.get('authorization')),
  })

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
    return jsonResponse(corsHeaders, { success: false, error: 'Method not allowed' }, 405)
  }

  try {
    const env = parseFunctionEnvironment()
    const authHeader = req.headers.get('authorization')

    console.log('[reactivate-public-registration] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(env?.supabaseUrl),
      hasServiceRoleKey: Boolean(env?.supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
      authHeaderPrefix: authHeader?.split(' ')[0] ?? null,
      authHeaderLength: authHeader?.length ?? 0,
    })

    if (!env) {
      return errorResponse(corsHeaders, 500, 'Environment not configured')
    }
    const { supabaseUrl, supabaseServiceKey } = env

    const parsedBody = await parseRequestBody(req, reactivatePublicRegistrationRequestSchema)
    if (!parsedBody.success) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: parsedBody.error,
          detail: parsedBody.details,
          error_code: 'INVALID_REQUEST',
        },
        400,
      )
    }

    const { registration_id }: AdminReactivatePublicRegistrationRequest = parsedBody.data

    console.log('[reactivate-public-registration] parsed body', {
      requestId,
      hasRegistrationId: Boolean(registration_id),
      registrationId: maskValue(registration_id ?? null),
    })

    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'reactivate-public-registration',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'reactivate-public-registration',
        windowMs: 60_000,
        maxHits: 30,
      },
    })

    if (!adminAccess.ok) {
      return adminAccess.response
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
      .from('public_registrations')
      .select('id, status, email, event_id')
      .eq('id', registration_id)
      .single()

    console.log('[reactivate-public-registration] registration fetch result', {
      requestId,
      registrationId: maskValue(registration_id),
      found: Boolean(registration),
      regFetchErrorCode: regFetchError?.code ?? null,
    })

    if (regFetchError || !registration) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Registration not found',
          error_code: 'NOT_FOUND',
        },
        404,
      )
    }

    // Check if already active (not cancelled)
    if (registration.status !== 'cancelled') {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Registration is not cancelled',
          error_code: 'NOT_CANCELLED',
        },
        400,
      )
    }

    // Update registration status back to submitted
    const { error: updateError } = await adminClient
      .from('public_registrations')
      .update({ status: 'submitted' })
      .eq('id', registration_id)

    console.log('[reactivate-public-registration] update result', {
      requestId,
      registrationId: maskValue(registration_id),
      updateErrorCode: updateError?.code ?? null,
    })

    if (updateError) {
      console.error('[reactivate-public-registration] update failed', {
        requestId,
        registrationId: maskValue(registration_id),
        error: updateError.message,
      })
      return errorResponse(corsHeaders, 500, 'Failed to reactivate registration')
    }

    // Log admin action (never block a successful reactivation if audit logging fails)
    await logAdminAction({
      adminClient,
      adminUserId: adminAccess.userId,
      action: 'reactivate_registration',
      resourceType: 'registration',
      resourceId: registration_id,
      metadata: {
        email: registration.email,
        event_id: registration.event_id,
        previous_status: registration.status,
        next_status: 'submitted',
        source: 'public_registration',
      },
    })

    console.log('[reactivate-public-registration] success', {
      requestId,
      registrationId: maskValue(registration_id),
    })

    return jsonResponse(corsHeaders, {
      success: true,
      registration_id,
    } as AdminReactivatePublicRegistrationSuccess)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[reactivate-public-registration] error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : null,
    })
    return errorResponse(corsHeaders, 500, 'Internal server error')
  }
})
