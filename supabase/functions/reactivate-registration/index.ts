import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { logAdminAction } from '@/shared/security.ts';
import { z } from '@/shared/validation.ts';

const reactivateRegistrationRequestSchema = z.object({
  registration_id: z.string().uuid('registration_id must be a valid UUID'),
});

type ReactivateRegistrationRequest = z.infer<typeof reactivateRegistrationRequestSchema>;

interface ReactivateRegistrationSuccess {
  success: true;
  registration_id: string;
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'reactivate-registration',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'reactivate-registration',
      windowMs: RATE_LIMIT_PRESETS.cancelRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cancelRegistration.maxHits,
    },
    schema: reactivateRegistrationRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { registration_id }: ReactivateRegistrationRequest = guard.data;
    const adminClient = guard.client;

    const { data: registration, error: regFetchError } = await adminClient
      .from('registrations')
      .select('id, status, event_id')
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

    const { error: updateError } = await adminClient
      .from('registrations')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', registration_id);

    if (updateError) {
      return errorResponse(corsHeaders, 500, 'Failed to reactivate registration', undefined, {
        error_code: 'UPDATE_FAILED',
      });
    }

    await logAdminAction({
      adminClient,
      adminUserId: guard.userId,
      action: 'reactivate_registration',
      resourceType: 'registration',
      resourceId: registration_id,
      metadata: {
        event_id: registration.event_id,
        previous_status: registration.status,
        next_status: 'updated',
      },
    });

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        registration_id,
      } as ReactivateRegistrationSuccess,
      200,
    );
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
