import { HTTP_STATUS, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { requireAdminAccess } from '@/shared/security.ts';
import { parseFunctionEnvironment } from '@/shared/validation.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  const guard = await useEdgeHook({
    req,
    functionName: 'cron-tokenize-users',
    allowAnyOrigin: true,
    method: 'POST',
    publicRateLimit: {
      scope: 'cron-tokenize-users',
      windowMs: RATE_LIMIT_PRESETS.cron.tokenizeUsers.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cron.tokenizeUsers.maxHits,
    },
  });

  if (!guard.valid) {
    return guard.response;
  }

  const env = parseFunctionEnvironment();
  if (!env) {
    return errorResponse(
      guard.corsHeaders,
      HTTP_STATUS.internalServerError,
      'Environment not configured',
    );
  }

  const authHeader = req.headers.get('authorization')?.trim() ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  let callerType: 'service_role' | 'admin';
  let callerId: string | null = null;

  if (token === env.supabaseServiceKey) {
    callerType = 'service_role';
  } else {
    const adminAccess = await requireAdminAccess({
      requestId: guard.requestId,
      logPrefix: 'cron-tokenize-users',
      supabaseUrl: env.supabaseUrl,
      supabaseServiceKey: env.supabaseServiceKey,
      authHeader,
      corsHeaders: guard.corsHeaders,
      allowedRoles: ['admin', 'super_admin'],
    });

    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    callerType = 'admin';
    callerId = adminAccess.userId;
  }

  try {
    console.log('[cron-tokenize-users] Executing tokenize_all_users RPC', {
      requestId: guard.requestId,
      callerType,
      callerId,
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
