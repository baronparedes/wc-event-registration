import { z } from 'npm:zod';

import { HTTP_STATUS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { errorResponse, jsonResponse } from '../_shared/http.ts';

const payloadSchema = z.object({
  action: z.enum(['subscribe', 'unsubscribe']),
  subscription: z
    .object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    })
    .optional(),
});

Deno.serve(async (req) => {
  const hook = await useEdgeHook({
    req,
    functionName: 'manage-push-subscription',
    method: 'POST',
    requireAuth: true,
    schema: payloadSchema,
  });

  if (!hook.valid) {
    return hook.response;
  }

  const { client: supabase, data: payload, userId, corsHeaders } = hook;

  try {
    if (payload.action === 'subscribe' && payload.subscription) {
      const { error } = await supabase.from('user_push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: payload.subscription.endpoint,
          p256dh_key: payload.subscription.keys.p256dh,
          auth_key: payload.subscription.keys.auth,
        },
        { onConflict: 'endpoint' },
      );

      if (error) {
        throw new Error(`Failed to save subscription: ${error.message}`);
      }
    } else if (payload.action === 'unsubscribe' && payload.subscription) {
      const { error } = await supabase
        .from('user_push_subscriptions')
        .delete()
        .eq('endpoint', payload.subscription.endpoint)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to remove subscription: ${error.message}`);
      }
    }

    return jsonResponse(corsHeaders, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(corsHeaders, HTTP_STATUS.internalServerError, message);
  }
});
