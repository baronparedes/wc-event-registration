export type CorsHeaders = Record<string, string>

export function jsonResponse<T>(corsHeaders: CorsHeaders, body: T, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function successResponse<T extends Record<string, unknown>>(
  corsHeaders: CorsHeaders,
  body: T,
  status = 200,
): Response {
  return jsonResponse(corsHeaders, { success: true, ...body }, status)
}

export function errorResponse(
  corsHeaders: CorsHeaders,
  status: number,
  error: string,
  detail?: string,
  extra?: Record<string, unknown>,
): Response {
  return jsonResponse(corsHeaders, { success: false, error, detail, ...extra }, status)
}
