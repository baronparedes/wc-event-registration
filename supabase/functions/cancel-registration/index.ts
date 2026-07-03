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

const cancelRegistrationRequestSchema = z.object({
  registration_id: z.string().uuid('registration_id must be a valid UUID'),
  reason: z.string().trim().min(1).max(500).optional(),
});

type CancelRegistrationRequest = z.infer<typeof cancelRegistrationRequestSchema>;

interface CancelRegistrationSuccess {
  success: true;
  registration_id: string;
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

  console.log('[cancel-registration]', {
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

    console.log('[cancel-registration] env/auth check', {
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

    const parsedBody = await parseRequestBody(req, cancelRegistrationRequestSchema);
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
      );
    }

    const { registration_id, reason }: CancelRegistrationRequest = parsedBody.data;

    console.log('[cancel-registration] parsed body', {
      requestId,
      hasRegistrationId: Boolean(registration_id),
      registrationId: maskValue(registration_id ?? null),
    });

    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'cancel-registration',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'cancel-registration',
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
      .from('registrations')
      .select('id, status, event_id')
      .eq('id', registration_id)
      .single();

    console.log('[cancel-registration] registration fetch result', {
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
        },
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
        },
        400,
      );
    }

    // Update registration status to cancelled
    const { error: updateError } = await adminClient
      .from('registrations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', registration_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return errorResponse(corsHeaders, 500, 'Failed to cancel registration', undefined, {
        error_code: 'UPDATE_FAILED',
      });
    }

    await logAdminAction({
      adminClient,
      adminUserId: adminAccess.userId,
      action: 'cancel_registration',
      resourceType: 'registration',
      resourceId: registration_id,
      metadata: {
        event_id: registration.event_id,
        previous_status: registration.status,
        next_status: 'cancelled',
        reason: reason ?? null,
      },
    });

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        registration_id,
      } as CancelRegistrationSuccess,
      200,
    );
  } catch (error) {
    console.error('[cancel-registration] unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
