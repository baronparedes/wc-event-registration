import { HTTP_STATUS, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  const guard = await useEdgeHook({
    req,
    functionName: 'cron-tokenize-users',
    allowAnyOrigin: true,
    method: 'POST',
    requireAdmin: true,
    allowServiceRole: true,
    allowedRoles: ['admin', 'super_admin'],
    publicRateLimit: {
      scope: 'cron-tokenize-users',
      windowMs: RATE_LIMIT_PRESETS.cron.tokenizeUsers.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cron.tokenizeUsers.maxHits,
    },
  });

  if (!guard.valid) {
    return guard.response;
  }

  try {
    console.log('[cron-tokenize-users] Executing tokenize_all_users RPC', {
      requestId: guard.requestId,
      callerType: guard.callerType,
      callerId: guard.userId,
    });

    const { data: insertedCount, error } = await guard.client.rpc('tokenize_all_users');

    if (error) {
      console.error('[cron-tokenize-users] RPC tokenize_all_users failed', {
        requestId: guard.requestId,
        error: error.message,
        code: error.code,
      });

      return errorResponse(
        guard.corsHeaders,
        HTTP_STATUS.internalServerError,
        'Failed to tokenize users',
        error.message,
      );
    }

    const finalInsertedCount = typeof insertedCount === 'number' ? insertedCount : 0;
    console.log('[cron-tokenize-users] Tokenization completed successfully', {
      requestId: guard.requestId,
      insertedCount: finalInsertedCount,
    });

    return successResponse(
      guard.corsHeaders,
      {
        inserted_count: finalInsertedCount,
        timestamp: new Date().toISOString(),
      },
      HTTP_STATUS.ok,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron-tokenize-users] Unexpected error', {
      requestId: guard.requestId,
      error: errorMessage,
    });

    return errorResponse(
      guard.corsHeaders,
      HTTP_STATUS.internalServerError,
      'Internal server error',
      errorMessage,
    );
  }
});
