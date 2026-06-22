import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
} from '../_shared/security.ts'

interface MemberLookupRequest {
  memberId: string
}

interface MemberLookupProfile {
  user_id: string
  full_name: string
  nickname: string | null
  first_name: string | null
  last_name: string | null
}

interface MemberLookupResponse {
  success: true
  profile: MemberLookupProfile | null
}

interface MemberLookupErrorResponse {
  success: false
  error: string
  detail?: string
}

type Response = MemberLookupResponse | MemberLookupErrorResponse

const allowedOrigins = readAllowedOrigins()

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return createObscuredDenyResponse(corsHeaders)
    }

    return new Response('ok', { headers: corsHeaders })
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return createObscuredDenyResponse(corsHeaders)
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Validate environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Environment not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse and validate request
    const body = (await req.json()) as MemberLookupRequest
    const { memberId } = body

    if (!memberId || typeof memberId !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request: memberId is required and must be a string',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Normalize input (match existing RPC behavior)
    const normalizedMemberId = memberId.trim()
    if (!normalizedMemberId) {
      return new Response(JSON.stringify({ success: true, profile: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create authenticated client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Query users table directly for member lookup
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, nickname, first_name, last_name')
      .eq('member_id', normalizedMemberId)
      .maybeSingle()

    if (error) {
      console.error('Query error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to lookup member',
          detail: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Transform response: rename id to user_id to match expected shape
    const profile = data
      ? ({
          user_id: data.id,
          full_name: data.full_name,
          nickname: data.nickname,
          first_name: data.first_name,
          last_name: data.last_name,
        } as MemberLookupProfile)
      : null

    return new Response(
      JSON.stringify({
        success: true,
        profile,
      } as MemberLookupResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        detail: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
