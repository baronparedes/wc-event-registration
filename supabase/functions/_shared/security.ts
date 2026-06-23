import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173'

const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000

type RateLimitBucket = {
  count: number
  windowStartMs: number
}

const rateLimitBuckets = new Map<string, RateLimitBucket>()
let lastRateLimitCleanupMs = 0

export interface RateLimitOptions {
  key: string
  windowMs: number
  maxHits: number
  nowMs?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export interface PublicRateLimitGuardOptions {
  req: Request
  origin: string | null
  corsHeaders: Record<string, string>
  scope: string
  windowMs: number
  maxHits: number
  errorMessage?: string
}

export interface AdminGuardOptions {
  requestId: string
  logPrefix: string
  supabaseUrl: string
  supabaseServiceKey: string
  authHeader: string | null
  corsHeaders: Record<string, string>
  rateLimit?: {
    scope: string
    windowMs: number
    maxHits: number
  }
}

export type AdminGuardResult = { ok: true; userId: string } | { ok: false; response: Response }

function maskValue(value: string | null, visible = 6): string {
  if (!value) return 'null'
  if (value.length <= visible * 2) return value
  return `${value.slice(0, visible)}...${value.slice(-visible)}`
}

function cleanupRateLimitBuckets(nowMs: number): void {
  if (nowMs - lastRateLimitCleanupMs < RATE_LIMIT_CLEANUP_INTERVAL_MS) {
    return
  }

  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (nowMs - bucket.windowStartMs > RATE_LIMIT_CLEANUP_INTERVAL_MS * 2) {
      rateLimitBuckets.delete(key)
    }
  }

  lastRateLimitCleanupMs = nowMs
}

function createJsonResponse(
  payload: unknown,
  status: number,
  corsHeaders: Record<string, string>,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(extraHeaders ?? {}),
    },
  })
}

export function enforceInMemoryRateLimit(options: RateLimitOptions): RateLimitResult {
  const nowMs = options.nowMs ?? Date.now()
  cleanupRateLimitBuckets(nowMs)

  const existing = rateLimitBuckets.get(options.key)
  if (!existing || nowMs - existing.windowStartMs >= options.windowMs) {
    rateLimitBuckets.set(options.key, { count: 1, windowStartMs: nowMs })
    return {
      allowed: true,
      remaining: Math.max(0, options.maxHits - 1),
      retryAfterSeconds: 0,
    }
  }

  existing.count += 1
  const overLimit = existing.count > options.maxHits
  if (overLimit) {
    const elapsedMs = nowMs - existing.windowStartMs
    const remainingWindowMs = Math.max(0, options.windowMs - elapsedMs)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(remainingWindowMs / 1000),
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.maxHits - existing.count),
    retryAfterSeconds: 0,
  }
}

export function getRequestIdentityForRateLimit(req: Request, origin: string | null): string {
  const xForwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const xRealIp = req.headers.get('x-real-ip')?.trim()
  const cfConnectingIp = req.headers.get('cf-connecting-ip')?.trim()

  return xForwardedFor || xRealIp || cfConnectingIp || `origin:${origin ?? 'unknown'}`
}

export function enforcePublicRateLimit(options: PublicRateLimitGuardOptions): Response | null {
  const sourceIdentity = getRequestIdentityForRateLimit(options.req, options.origin)
  const rateLimit = enforceInMemoryRateLimit({
    key: `${options.scope}:${sourceIdentity}`,
    windowMs: options.windowMs,
    maxHits: options.maxHits,
  })

  if (rateLimit.allowed) {
    return null
  }

  return createJsonResponse(
    {
      success: false,
      error: options.errorMessage ?? 'Too many requests',
      error_code: 'RATE_LIMITED',
      retry_after_seconds: rateLimit.retryAfterSeconds,
    },
    429,
    options.corsHeaders,
    {
      'Retry-After': String(rateLimit.retryAfterSeconds),
    },
  )
}

export async function requireAdminAccess(options: AdminGuardOptions): Promise<AdminGuardResult> {
  const {
    requestId,
    logPrefix,
    supabaseUrl,
    supabaseServiceKey,
    authHeader,
    corsHeaders,
    rateLimit,
  } = options

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      response: createJsonResponse(
        {
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        },
        401,
        corsHeaders,
      ),
    }
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return {
      ok: false,
      response: createJsonResponse(
        {
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        },
        401,
        corsHeaders,
      ),
    }
  }

  const authClient = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  const userId = authData?.user?.id ?? null

  console.log(`[${logPrefix}] auth user check`, {
    requestId,
    hasUser: Boolean(authData?.user),
    userId: maskValue(userId),
    authErrorStatus: authError?.status ?? null,
    authErrorMessage: authError?.message ?? null,
  })

  if (!userId) {
    return {
      ok: false,
      response: createJsonResponse(
        {
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        },
        401,
        corsHeaders,
      ),
    }
  }

  if (rateLimit) {
    const limiterKey = `${rateLimit.scope}:${userId}`
    const limitResult = enforceInMemoryRateLimit({
      key: limiterKey,
      windowMs: rateLimit.windowMs,
      maxHits: rateLimit.maxHits,
    })

    if (!limitResult.allowed) {
      return {
        ok: false,
        response: createJsonResponse(
          {
            success: false,
            error: 'Too many requests',
            error_code: 'RATE_LIMITED',
            retry_after_seconds: limitResult.retryAfterSeconds,
          },
          429,
          corsHeaders,
          {
            'Retry-After': String(limitResult.retryAfterSeconds),
          },
        ),
      }
    }
  }

  const { data: adminRecord, error: adminCheckError } = await authClient
    .from('admins')
    .select('id')
    .eq('auth_user_id', userId)
    .single()

  console.log(`[${logPrefix}] admin check result`, {
    requestId,
    userId: maskValue(userId),
    hasAdminRecord: Boolean(adminRecord),
    adminCheckErrorCode: adminCheckError?.code ?? null,
    adminCheckErrorMessage: adminCheckError?.message ?? null,
  })

  if (adminCheckError || !adminRecord) {
    return {
      ok: false,
      response: createJsonResponse(
        {
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        },
        401,
        corsHeaders,
      ),
    }
  }

  return { ok: true, userId }
}

export function readAllowedOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): origin is string {
  if (!origin) {
    return false
  }

  return allowedOrigins.includes(origin)
}

export function buildCorsHeaders(origin: string | null, allowedOrigins: string[]) {
  const fallbackOrigin = allowedOrigins[0] ?? DEFAULT_ALLOWED_ORIGIN

  return {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Access-Control-Allow-Origin': isOriginAllowed(origin, allowedOrigins)
      ? origin
      : fallbackOrigin,
    Vary: 'Origin',
  }
}

// Keep deny responses intentionally generic to avoid exposing allowlist behavior.
export function createObscuredDenyResponse(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
