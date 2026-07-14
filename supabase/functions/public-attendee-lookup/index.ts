import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { parseRequestBody, z } from '@/shared/validation.ts';

const publicRegistrationCheckRequestSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  event_slug: z.string().trim().min(1, 'Event slug is required'),
});

type PublicRegistrationCheckRequest = z.infer<typeof publicRegistrationCheckRequestSchema>;

interface PublicRegistrationCheckSuccess {
  success: true;
  existing_registration?: {
    id: string;
    status: string;
    submitted_at: string;
  };
}

interface PublicRegistrationCheckNotFound {
  success: false;
  reason: 'not_found';
}

interface PublicRegistrationCheckError {
  success: false;
  reason: 'validation_error' | 'internal_error';
  message: string;
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'public-attendee-lookup',
    method: 'POST',
    publicRateLimit: {
      scope: 'public-registration-check',
      windowMs: RATE_LIMIT_PRESETS.memberLookup.windowMs,
      maxHits: RATE_LIMIT_PRESETS.memberLookup.maxHits,
    },
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const parsedBody = await parseRequestBody(req, publicRegistrationCheckRequestSchema);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'validation_error',
          message: parsedBody.details ?? parsedBody.error,
        } as PublicRegistrationCheckError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { email, event_slug }: PublicRegistrationCheckRequest = parsedBody.data;

    const supabase = guard.client;

    // Step 1: Look up event by slug
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, duplicate_policy')
      .eq('slug', event_slug)
      .maybeSingle();

    if (eventError) {
      console.error('Event lookup error:', eventError);
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
      );
    }

    // If event not found, return not_found (attendee hasn't registered yet)
    if (!eventData) {
      return new Response(
        JSON.stringify({ success: false, reason: 'not_found' } as PublicRegistrationCheckNotFound),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (
      eventData.duplicate_policy === 'allow_multiple' ||
      eventData.duplicate_policy === 'allow_multiple_update'
    ) {
      return new Response(JSON.stringify({ success: true } as PublicRegistrationCheckSuccess), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Check for existing registration for this event + email
    let registrationQuery = supabase
      .from('public_registrations')
      .select('id, status, submitted_at')
      .eq('event_id', eventData.id)
      .ilike('email', email)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (eventData.duplicate_policy !== 'block') {
      registrationQuery = registrationQuery.eq('registration_scope_key', 'primary');
    }

    const { data: regData, error: regError } = await registrationQuery.maybeSingle();

    if (regError) {
      console.error('Registration lookup error:', regError);
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
      );
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
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
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
    );
  }
});
