import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { HTTP_STATUS } from './constants.ts';
import { errorResponse } from './http.ts';
import {
  type AdminAccountRole,
  buildCorsHeaders,
  createObscuredDenyResponse,
  enforcePublicRateLimit,
  isOriginAllowed,
  readAllowedOrigins,
  requireAdminAccess,
} from './security.ts';
import { parseFunctionEnvironment, parseRequestBody, z } from './validation.ts';

type CorsHeaders = Record<string, string>;
type EdgeClient = ReturnType<typeof createClient>;

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
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  publicRateLimit?: PublicRateLimitConfig;
};

type EdgeHookAdminOptions =
  | {
      requireAdmin: true;
      rateLimit?: AdminRateLimitConfig;
      allowedRoles?: AdminAccountRole[];
    }
  | {
      requireAdmin?: false;
      rateLimit?: never;
      allowedRoles?: never;
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
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  if (options.req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin, allowedOrigins)) {
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

  if (!isOriginAllowed(origin, allowedOrigins)) {
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
  if (options.requireAdmin) {
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

    userId = adminAccess.userId;
  }

  const client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
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
  };
}
