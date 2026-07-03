import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { errorResponse, jsonResponse } from '@/shared/http.ts';
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  logAdminAction,
  readAllowedOrigins,
  requireAdminAccess,
} from '@/shared/security.ts';
import { parseFunctionEnvironment, parseRequestBody, z } from '@/shared/validation.ts';

const cancelPublicRegistrationRequestSchema = z.object({
  registration_id: z.string().uuid('registration_id must be a valid UUID'),
  reason: z.string().trim().min(1).max(500).optional(),
});

type CancelPublicRegistrationRequest = z.infer<typeof cancelPublicRegistrationRequestSchema>;

interface CancelPublicRegistrationSuccess {
  success: true;
  registration_id: string;
}

interface CancelPublicRegistrationError {
  success: false;
  error: string;
  error_code?: string;
}

const allowedOrigins = readAllowedOrigins();

function maskValue(value: string | null, visible = 6): string {
  if (!value) return 'null';
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  console.log('[cancel-public-registration]', {
    requestId,
    method: req.method,
    origin,
    hasAuthorizationHeader: Boolean(req.headers.get('authorization')),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return createObscuredDenyResponse(corsHeaders);
    }

    return new Response('ok', { headers: corsHeaders });
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return createObscuredDenyResponse(corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse(corsHeaders, { success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const env = parseFunctionEnvironment();
    const authHeader = req.headers.get('authorization');

    console.log('[cancel-public-registration] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(env?.supabaseUrl),
      hasServiceRoleKey: Boolean(env?.supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
      authHeaderPrefix: authHeader?.split(' ')[0] ?? null,
      authHeaderLength: authHeader?.length ?? 0,
    });

    if (!env) {
      return errorResponse(corsHeaders, 500, 'Environment not configured');
    }
    const { supabaseUrl, supabaseServiceKey } = env;

    const parsedBody = await parseRequestBody(req, cancelPublicRegistrationRequestSchema);
    if (!parsedBody.success) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: parsedBody.error,
          detail: parsedBody.details,
          error_code: 'INVALID_REQUEST',
        } as CancelPublicRegistrationError,
        400,
      );
    }

    const { registration_id, reason }: CancelPublicRegistrationRequest = parsedBody.data;

    console.log('[cancel-public-registration] parsed body', {
      requestId,
      hasRegistrationId: Boolean(registration_id),
      registrationId: maskValue(registration_id ?? null),
      hasReason: Boolean(reason),
    });

    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'cancel-public-registration',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'cancel-public-registration',
        windowMs: 60_000,
        maxHits: 30,
      },
    });

    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    // Create service role client for privileged operations after auth check
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch registration to verify it exists
    const { data: registration, error: regFetchError } = await adminClient
      .from('public_registrations')
      .select('id, status, email, event_id')
      .eq('id', registration_id)
      .single();

    console.log('[cancel-public-registration] registration fetch result', {
      requestId,
      registrationId: maskValue(registration_id),
      found: Boolean(registration),
      regFetchErrorCode: regFetchError?.code ?? null,
    });

    if (regFetchError || !registration) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Registration not found',
          error_code: 'NOT_FOUND',
        } as CancelPublicRegistrationError,
        404,
      );
    }

    // Check if already cancelled
    if (registration.status === 'cancelled') {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Registration is already cancelled',
          error_code: 'ALREADY_CANCELLED',
        } as CancelPublicRegistrationError,
        400,
      );
    }

    // Update registration status to cancelled
    const { error: updateError } = await adminClient
      .from('public_registrations')
      .update({ status: 'cancelled' })
      .eq('id', registration_id);

    console.log('[cancel-public-registration] update result', {
      requestId,
      registrationId: maskValue(registration_id),
      updateErrorCode: updateError?.code ?? null,
    });

    if (updateError) {
      console.error('[cancel-public-registration] update failed', {
        requestId,
        registrationId: maskValue(registration_id),
        error: updateError.message,
      });
      return errorResponse(corsHeaders, 500, 'Failed to cancel registration');
    }

    // Log admin action (never block a successful cancellation if audit logging fails)
    await logAdminAction({
      adminClient,
      adminUserId: adminAccess.userId,
      action: 'cancel_registration',
      resourceType: 'registration',
      resourceId: registration_id,
      metadata: {
        email: registration.email,
        event_id: registration.event_id,
        previous_status: registration.status,
        next_status: 'cancelled',
        source: 'public_registration',
        reason: reason ?? null,
      },
    });

    console.log('[cancel-public-registration] success', {
      requestId,
      registrationId: maskValue(registration_id),
    });

    return jsonResponse(corsHeaders, {
      success: true,
      registration_id,
    } as CancelPublicRegistrationSuccess);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cancel-public-registration] error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : null,
    });
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
