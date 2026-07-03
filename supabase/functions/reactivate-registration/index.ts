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

const reactivateRegistrationRequestSchema = z.object({
  registration_id: z.string().uuid('registration_id must be a valid UUID'),
})

type ReactivateRegistrationRequest = z.infer<typeof reactivateRegistrationRequestSchema>

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
    return jsonResponse(corsHeaders, { success: false, error: 'Method not allowed' }, 405)
  }

  try {
    const env = parseFunctionEnvironment()
    const authHeader = req.headers.get('authorization')

    console.log('[reactivate-registration] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(env?.supabaseUrl),
      hasServiceRoleKey: Boolean(env?.supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
    })

    if (!env) {
      return errorResponse(corsHeaders, 500, 'Environment not configured')
    }
    const { supabaseUrl, supabaseServiceKey } = env

    const parsedBody = await parseRequestBody(req, reactivateRegistrationRequestSchema)
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

    const { registration_id }: ReactivateRegistrationRequest = parsedBody.data

    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'reactivate-registration',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'reactivate-registration',
        windowMs: 60_000,
        maxHits: 30,
      },
    })

    if (!adminAccess.ok) {
      return adminAccess.response
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: registration, error: regFetchError } = await adminClient
      .from('registrations')
      .select('id, status, event_id')
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

    const { error: updateError } = await adminClient
      .from('registrations')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', registration_id)

    if (updateError) {
      console.error('[reactivate-registration] update error', {
        requestId,
        errorCode: updateError.code,
        errorMessage: updateError.message,
      })
      return errorResponse(corsHeaders, 500, 'Failed to reactivate registration', undefined, {
        error_code: 'UPDATE_FAILED',
      })
    }

    await logAdminAction({
      adminClient,
      adminUserId: adminAccess.userId,
      action: 'reactivate_registration',
      resourceType: 'registration',
      resourceId: registration_id,
      metadata: {
        event_id: registration.event_id,
        previous_status: registration.status,
        next_status: 'updated',
      },
    })

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        registration_id,
      } as ReactivateRegistrationSuccess,
      200,
    )
  } catch (error) {
    console.error('[reactivate-registration] unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(corsHeaders, 500, 'Internal server error')
  }
})
