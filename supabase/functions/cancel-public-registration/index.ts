import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { logAdminAction } from '@/shared/security.ts';
import { z } from '@/shared/validation.ts';

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

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'cancel-public-registration',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'cancel-public-registration',
      windowMs: RATE_LIMIT_PRESETS.cancelRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cancelRegistration.maxHits,
    },
    schema: cancelPublicRegistrationRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { registration_id, reason }: CancelPublicRegistrationRequest = guard.data;

    const adminClient = guard.client;

    // Fetch registration to verify it exists
    const { data: registration, error: regFetchError } = await adminClient
      .from('public_registrations')
      .select('id, status, email, event_id')
      .eq('id', registration_id)
      .single();

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

    if (updateError) {
      return errorResponse(corsHeaders, 500, 'Failed to cancel registration');
    }

    // Log admin action (never block a successful cancellation if audit logging fails)
    await logAdminAction({
      adminClient,
      adminUserId: guard.userId,
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

    return jsonResponse(corsHeaders, {
      success: true,
      registration_id,
    } as CancelPublicRegistrationSuccess);
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
