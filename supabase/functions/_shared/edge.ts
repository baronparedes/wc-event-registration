import { createClient } from '@supabase/supabase-js';

import { HTTP_STATUS } from './constants.ts';
import type { Database } from './database.types.ts';
import { errorResponse } from './http.ts';
import {
  type AdminAccountRole,
  buildCorsHeaders,
  createObscuredDenyResponse,
  enforcePublicRateLimit,
  isOriginAllowed,
  readAllowedOrigins,
  requireAdminAccess,
  requireAuthAccess,
} from './security.ts';
import { parseFunctionEnvironment, parseRequestBody, z } from './validation.ts';

type CorsHeaders = Record<string, string>;
type EdgeClient = ReturnType<typeof createClient<Database>>;

type AdminRateLimitConfig = {
  scope: string;
  windowMs: number;
  maxHits: number;
};

type PublicRateLimitConfig = {
  scope: string;
  windowMs: number;
  maxHits: number;
  errorMessage?: string;
};

type EdgeHookBaseOptions = {
  req: Request;
  functionName: string;
  allowedOrigins?: string[];
  allowAnyOrigin?: boolean;
  allowMissingOrigin?: boolean;
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  publicRateLimit?: PublicRateLimitConfig;
};

type EdgeHookAdminOptions =
  | {
      requireAdmin: true;
      requireAuth?: never;
      requireCron?: never;
      rateLimit?: AdminRateLimitConfig;
      allowedRoles?: AdminAccountRole[];
      /** Also accept SUPABASE_SERVICE_ROLE_KEY as a valid caller (e.g. cron jobs). */
      allowServiceRole?: boolean;
      /** Also accept CRON_ROLE_KEY (via X-Cron-Key or Bearer token) as a valid caller. */
      allowCronRole?: boolean;
    }
  | {
      requireAdmin?: false;
      requireAuth: true;
      requireCron?: never;
      rateLimit?: never;
      allowedRoles?: never;
      allowServiceRole?: never;
      allowCronRole?: never;
    }
  | {
      requireAdmin?: false;
      requireAuth?: false;
      /** Strictly require CRON_ROLE_KEY (or optionally SUPABASE_SERVICE_ROLE_KEY if allowServiceRole is true). */
      requireCron: true;
      rateLimit?: never;
      allowedRoles?: never;
      allowServiceRole?: boolean;
      allowCronRole?: true;
    }
  | {
      requireAdmin?: false;
      requireAuth?: false;
      requireCron?: false;
      rateLimit?: never;
      allowedRoles?: never;
      allowServiceRole?: never;
      allowCronRole?: boolean;
    };

type EdgeHookOptions = EdgeHookBaseOptions & EdgeHookAdminOptions;

type EdgeHookWithSchemaOptions<TSchema extends z.ZodTypeAny> = EdgeHookOptions & {
  schema: TSchema;
};

type EdgeHookWithoutSchemaOptions = EdgeHookOptions & {
  schema?: undefined;
};

type EdgeHookFailure = {
  valid: false;
  response: Response;
  requestId: string;
  corsHeaders: CorsHeaders;
};

type EdgeHookSuccess<TData> = {
  valid: true;
  response: null;
  requestId: string;
  corsHeaders: CorsHeaders;
  client: EdgeClient;
  data: TData;
  userId: string | null;
  /** 'service_role' when called by service key, 'cron' when called by cron key, 'admin' when called by an admin JWT, 'user' when called by a normal JWT, null otherwise. */
  callerType: 'service_role' | 'cron' | 'admin' | 'user' | null;
};

export type EdgeHookResult<TData> = EdgeHookFailure | EdgeHookSuccess<TData>;

export async function useEdgeHook<TSchema extends z.ZodTypeAny>(
  options: EdgeHookWithSchemaOptions<TSchema>,
): Promise<EdgeHookResult<z.infer<TSchema>>>;
export async function useEdgeHook(
  options: EdgeHookWithoutSchemaOptions,
): Promise<EdgeHookResult<null>>;
export async function useEdgeHook<TSchema extends z.ZodTypeAny>(
  options: EdgeHookWithSchemaOptions<TSchema> | EdgeHookWithoutSchemaOptions,
): Promise<EdgeHookResult<z.infer<TSchema> | null>> {
  const requestId = crypto.randomUUID();
  const allowedOrigins = options.allowedOrigins ?? readAllowedOrigins();
  const origin = options.req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(
    origin,
    options.allowAnyOrigin && origin ? [origin] : allowedOrigins,
  );
  const originAllowed =
    options.allowAnyOrigin ||
    (origin === null
      ? options.allowMissingOrigin === true
      : isOriginAllowed(origin, allowedOrigins));

  // ⚠️ CORS allowlist is one layer of defense.
  // Non-browser clients can spoof Origin headers or bypass CORS entirely.
  // Rate limiting and request validation below are additional layers.

  if (options.req.method === 'OPTIONS') {
    if (!originAllowed) {
      return {
        valid: false,
        response: createObscuredDenyResponse(corsHeaders),
        requestId,
        corsHeaders,
      };
    }

    return {
      valid: false,
      response: new Response('ok', { headers: corsHeaders }),
      requestId,
      corsHeaders,
    };
  }

  if (!originAllowed) {
    return {
      valid: false,
      response: createObscuredDenyResponse(corsHeaders),
      requestId,
      corsHeaders,
    };
  }

  const expectedMethod = options.method ?? 'POST';
  if (options.req.method !== expectedMethod) {
    return {
      valid: false,
      response: errorResponse(corsHeaders, HTTP_STATUS.methodNotAllowed, 'Method not allowed'),
      requestId,
      corsHeaders,
    };
  }

  const env = parseFunctionEnvironment();
  if (!env) {
    return {
      valid: false,
      response: errorResponse(
        corsHeaders,
        HTTP_STATUS.internalServerError,
        'Environment not configured',
      ),
      requestId,
      corsHeaders,
    };
  }

  if (options.publicRateLimit) {
    const rateLimitResponse = enforcePublicRateLimit({
      req: options.req,
      origin,
      corsHeaders,
      scope: options.publicRateLimit.scope,
      windowMs: options.publicRateLimit.windowMs,
      maxHits: options.publicRateLimit.maxHits,
      errorMessage: options.publicRateLimit.errorMessage,
    });

    if (rateLimitResponse) {
      return {
        valid: false,
        response: rateLimitResponse,
        requestId,
        corsHeaders,
      };
    }
  }

  if (options.rateLimit && !options.requireAdmin) {
    return {
      valid: false,
      response: errorResponse(
        corsHeaders,
        HTTP_STATUS.internalServerError,
        'Invalid hook configuration: rateLimit requires requireAdmin=true',
      ),
      requestId,
      corsHeaders,
    };
  }

  let parsedData: z.infer<TSchema> | null = null;
  if ('schema' in options && options.schema) {
    const parsedBody = await parseRequestBody(options.req, options.schema);
    if (!parsedBody.success) {
      return {
        valid: false,
        response: errorResponse(
          corsHeaders,
          HTTP_STATUS.badRequest,
          parsedBody.error,
          parsedBody.details,
        ),
        requestId,
        corsHeaders,
      };
    }

    parsedData = parsedBody.data;
  }

  let userId: string | null = null;
  let callerType: 'service_role' | 'cron' | 'admin' | 'user' | null = null;

  if (options.allowCronRole || options.requireCron) {
    const cronKeyHeader = options.req.headers.get('x-cron-key')?.trim();
    const authHeader = options.req.headers.get('authorization')?.trim() ?? '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const providedKey = cronKeyHeader || bearerToken;
    const expectedCronKey = env.cronRoleKey || Deno.env.get('CRON_ROLE_KEY');

    if (expectedCronKey && providedKey && providedKey === expectedCronKey) {
      callerType = 'cron';
    }
  }

  if (callerType === 'cron') {
    console.log(`[${options.functionName}] [auth] Authenticated via CRON_ROLE_KEY`, { requestId });
  } else if (options.requireCron) {
    if (options.allowServiceRole) {
      const authHeader = options.req.headers.get('authorization')?.trim() ?? '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (token === env.supabaseServiceKey) {
        callerType = 'service_role';
        console.log(
          `[${options.functionName}] [auth] Authenticated via SUPABASE_SERVICE_ROLE_KEY`,
          {
            requestId,
          },
        );
      } else {
        return {
          valid: false,
          response: errorResponse(
            corsHeaders,
            HTTP_STATUS.unauthorized,
            'Unauthorized: Invalid Cron or Service Key',
          ),
          requestId,
          corsHeaders,
        };
      }
    } else {
      return {
        valid: false,
        response: errorResponse(
          corsHeaders,
          HTTP_STATUS.unauthorized,
          'Unauthorized: Invalid Cron Key',
        ),
        requestId,
        corsHeaders,
      };
    }
  } else if (options.requireAdmin) {
    if (options.allowServiceRole) {
      const authHeader = options.req.headers.get('authorization')?.trim() ?? '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (token === env.supabaseServiceKey) {
        callerType = 'service_role';
        console.log(
          `[${options.functionName}] [auth] Authenticated via SUPABASE_SERVICE_ROLE_KEY`,
          {
            requestId,
          },
        );
      } else {
        const adminAccess = await requireAdminAccess({
          requestId,
          logPrefix: options.functionName,
          supabaseUrl: env.supabaseUrl,
          supabaseServiceKey: env.supabaseServiceKey,
          authHeader,
          corsHeaders,
          rateLimit: options.rateLimit,
          allowedRoles: options.allowedRoles,
        });

        if (!adminAccess.ok) {
          return {
            valid: false,
            response: adminAccess.response,
            requestId,
            corsHeaders,
          };
        }

        callerType = 'admin';
        userId = adminAccess.userId;
      }
    } else {
      const adminAccess = await requireAdminAccess({
        requestId,
        logPrefix: options.functionName,
        supabaseUrl: env.supabaseUrl,
        supabaseServiceKey: env.supabaseServiceKey,
        authHeader: options.req.headers.get('authorization'),
        corsHeaders,
        rateLimit: options.rateLimit,
        allowedRoles: options.allowedRoles,
      });

      if (!adminAccess.ok) {
        return {
          valid: false,
          response: adminAccess.response,
          requestId,
          corsHeaders,
        };
      }

      callerType = 'admin';
      userId = adminAccess.userId;
    }
  } else if (options.requireAuth) {
    const authAccess = await requireAuthAccess({
      requestId,
      logPrefix: options.functionName,
      supabaseUrl: env.supabaseUrl,
      supabaseServiceKey: env.supabaseServiceKey,
      authHeader: options.req.headers.get('authorization'),
      corsHeaders,
    });

    if (!authAccess.ok) {
      return {
        valid: false,
        response: authAccess.response,
        requestId,
        corsHeaders,
      };
    }

    callerType = 'user';
    userId = authAccess.userId;
  }

  const clientHeaders: Record<string, string> = {};
  if (userId) {
    clientHeaders['x-admin-id'] = userId;
  }
  if (callerType === 'cron') {
    clientHeaders['x-caller-type'] = 'cron';
  } else if (callerType === 'service_role') {
    clientHeaders['x-caller-type'] = 'service_role';
  }

  const client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    global: {
      headers: clientHeaders,
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return {
    valid: true,
    response: null,
    requestId,
    corsHeaders,
    client,
    data: parsedData,
    userId,
    callerType,
  };
}

/**
 * Detects whether the current edge function runtime is operating in a local development/broadcast simulation mode.
 * In local mode, outbound external network operations (e.g. Resend emails and Web Push dispatches)
 * are safely simulated and logged locally without making real third-party API calls.
 */
export function isLocalBroadcastEnabled(): boolean {
  const envFlag = Deno.env.get('LOCAL_BROADCAST')?.trim().toLowerCase();
  if (envFlag === 'false' || envFlag === '0') return false;

  const nodeEnv = Deno.env.get('NODE_ENV')?.trim().toLowerCase();
  if (nodeEnv === 'test') {
    return false;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  let supabaseHost = '';
  try {
    supabaseHost = new URL(supabaseUrl).hostname.toLowerCase();
  } catch {
    // Ignore invalid/missing URL and continue with other environment signals.
  }
  // Skip during unit test mocks
  if (supabaseHost === 'example.supabase.co') {
    return false;
  }

  if (envFlag === 'true' || envFlag === '1') return true;

  const runtimeEnv = Deno.env.get('RUNTIME_ENV')?.trim().toLowerCase();
  if (runtimeEnv === 'local' || runtimeEnv === 'development') {
    return true;
  }
  if (runtimeEnv === 'production' || runtimeEnv === 'prod') {
    return false;
  }

  // Local Supabase CLI instances
  if (
    supabaseHost === 'localhost' ||
    supabaseHost === '127.0.0.1' ||
    supabaseHost === 'kong'
  ) {
    return true;
  }

  // Supabase Cloud hosted edge functions
  if (
    supabaseHost.endsWith('.supabase.co') ||
    supabaseHost.endsWith('.supabase.net') ||
    Boolean(Deno.env.get('DENO_REGION')) ||
    Boolean(Deno.env.get('DENO_DEPLOYMENT_ID'))
  ) {
    return false;
  }

  const isProd =
    Deno.env.get('ENVIRONMENT') === 'production' || Deno.env.get('NODE_ENV') === 'production';
  return !isProd;
}
