import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  logAdminAction,
  requireAdminAccess,
  readAllowedOrigins,
} from '../_shared/security.ts'
import { POSTGRES_ERROR_CODES, RATE_LIMIT_PRESETS } from '../_shared/constants.ts'

interface CreateMemberRequest {
  member_id: string
  first_name: string
  last_name: string
  nickname?: string | null
  email?: string | null
  phone?: string | null
  date_of_birth?: string | null
  role: string
  category: string
}

interface CreateMemberSuccess {
  success: true
  id: string
  member_id: string
  full_name: string
}

interface CreateMemberError {
  success: false
  error: string
  error_code?: string
}

const allowedOrigins = readAllowedOrigins()

function maskValue(value: string | null, visible = 6): string {
  if (!value) return 'null'
  if (value.length <= visible * 2) return value
  return `${value.slice(0, visible)}...${value.slice(-visible)}`
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins)

  console.log('[create-member]', {
    requestId,
    method: req.method,
    origin,
    hasAuthorizationHeader: Boolean(req.headers.get('authorization')),
  })

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
    const authHeader = req.headers.get('authorization')

    console.log('[create-member] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Environment not configured',
        } as CreateMemberError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse and validate request
    const body = (await req.json()) as CreateMemberRequest
    const {
      member_id,
      first_name,
      last_name,
      nickname,
      email,
      phone,
      date_of_birth,
      role,
      category,
    } = body

    console.log('[create-member] parsed body', {
      requestId,
      memberId: maskValue(member_id ?? null),
      firstName: maskValue(first_name ?? null),
      lastName: maskValue(last_name ?? null),
      hasMemberId: Boolean(member_id),
      hasFirstName: Boolean(first_name),
      hasLastName: Boolean(last_name),
      hasRole: Boolean(role),
      hasCategory: Boolean(category),
    })

    // Validate required fields
    if (!member_id || !member_id.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Member ID is required',
          error_code: 'INVALID_REQUEST',
        } as CreateMemberError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!first_name || !first_name.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'First name is required',
          error_code: 'INVALID_REQUEST',
        } as CreateMemberError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!last_name || !last_name.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Last name is required',
          error_code: 'INVALID_REQUEST',
        } as CreateMemberError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!role || !role.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Role is required',
          error_code: 'INVALID_REQUEST',
        } as CreateMemberError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!category || !category.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Category is required',
          error_code: 'INVALID_REQUEST',
        } as CreateMemberError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const normalizedFirstName = first_name.trim()
    const normalizedLastName = last_name.trim()
    const normalizedRole = role.trim()
    const normalizedCategory = category.trim()
    const derivedFullName = `${normalizedFirstName} ${normalizedLastName}`

    // Require admin access
    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'create-member',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'create-member',
        windowMs: RATE_LIMIT_PRESETS.createMember.windowMs,
        maxHits: RATE_LIMIT_PRESETS.createMember.maxHits,
      },
    })

    if (!adminAccess.ok) {
      return adminAccess.response
    }

    // Create service role client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Build metadata object with role and category
    const metadata: Record<string, unknown> = {
      role: normalizedRole,
      category: normalizedCategory,
    }

    // Helper to normalize empty strings to null
    const toNull = (val: string | null | undefined): string | null => {
      if (!val) return null
      const trimmed = val.trim()
      return trimmed.length > 0 ? trimmed : null
    }

    // Insert new member
    const { data: newMember, error: insertError } = await adminClient
      .from('users')
      .insert({
        member_id: member_id.trim(),
        full_name: derivedFullName,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        nickname: toNull(nickname),
        email: toNull(email),
        phone: toNull(phone),
        date_of_birth: toNull(date_of_birth),
        metadata,
      })
      .select('id, member_id, full_name')
      .single()

    console.log('[create-member] insert result', {
      requestId,
      memberId: maskValue(member_id),
      fullName: maskValue(derivedFullName),
      insertErrorCode: insertError?.code ?? null,
      insertErrorDetails: insertError?.details ?? null,
      hasNewMember: Boolean(newMember),
    })

    if (insertError) {
      // Check for specific error types
      if (insertError.code === POSTGRES_ERROR_CODES.uniqueViolation) {
        // Unique constraint violation for member_id
        return new Response(
          JSON.stringify({
            success: false,
            error: `Member ID "${member_id}" already exists`,
            error_code: 'MEMBER_ID_DUPLICATE',
          } as CreateMemberError),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // Generic error
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message || 'Failed to create member',
          error_code: insertError.code || 'INSERT_FAILED',
        } as CreateMemberError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!newMember) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Member created but could not retrieve record',
          error_code: 'RETRIEVE_FAILED',
        } as CreateMemberError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Log the action
    await logAdminAction({
      supabaseUrl,
      supabaseServiceKey,
      action: 'create_member',
      adminId: adminAccess.adminId,
      details: {
        memberId: newMember.member_id,
        fullName: newMember.full_name,
      },
      requestId,
    })

    console.log('[create-member] success', {
      requestId,
      memberId: maskValue(newMember.member_id),
      fullName: maskValue(newMember.full_name),
    })

    return new Response(
      JSON.stringify({
        success: true,
        id: newMember.id,
        member_id: newMember.member_id,
        full_name: newMember.full_name,
      } as CreateMemberSuccess),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[create-member] error', {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred',
        error_code: 'INTERNAL_ERROR',
      } as CreateMemberError),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
