const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173'

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
