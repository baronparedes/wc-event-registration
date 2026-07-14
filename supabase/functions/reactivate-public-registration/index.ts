import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { logAdminAction } from '@/shared/security.ts';
import { z } from '@/shared/validation.ts';

const reactivatePublicRegistrationRequestSchema = z.object({
  registration_id: z.string().uuid('registration_id must be a valid UUID'),
});

type AdminReactivatePublicRegistrationRequest = z.infer<
  typeof reactivatePublicRegistrationRequestSchema
>;

type AdminReactivatePublicRegistrationSuccess = {
  success: true;
  registration_id: string;
};

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'reactivate-public-registration',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'reactivate-public-registration',
      windowMs: RATE_LIMIT_PRESETS.cancelRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cancelRegistration.maxHits,
    },
    schema: reactivatePublicRegistrationRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { registration_id }: AdminReactivatePublicRegistrationRequest = guard.data;
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
        },
        404,
      );
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
      );
    }

    // Update registration status back to submitted
    const { error: updateError } = await adminClient
      .from('public_registrations')
      .update({ status: 'submitted' })
      .eq('id', registration_id);

    if (updateError) {
      return errorResponse(corsHeaders, 500, 'Failed to reactivate registration');
    }

    // Log admin action (never block a successful reactivation if audit logging fails)
    await logAdminAction({
      adminClient,
      adminUserId: guard.userId,
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
    });

    return jsonResponse(corsHeaders, {
      success: true,
      registration_id,
    } as AdminReactivatePublicRegistrationSuccess);
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
