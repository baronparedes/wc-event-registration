import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
} from '../_shared/security.ts'

interface ExportRegistrationsRequest {
  event_id: string
}

const allowedOrigins = readAllowedOrigins()

function maskValue(value: string | null, visible = 6): string {
  if (!value) return 'null'
  if (value.length <= visible * 2) return value
  return `${value.slice(0, visible)}...${value.slice(-visible)}`
}

// Helper function to escape CSV fields
function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return ''
  }

  let value = String(field)

  // If field contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    value = '"' + value.replace(/"/g, '""') + '"'
  }

  return value
}

// Helper to format answer value based on type
function formatAnswerValue(answer: unknown, fieldType: string): string {
  if (answer === null || answer === undefined) {
    return ''
  }

  if (fieldType === 'boolean') {
    return answer === true ? 'true' : answer === false ? 'false' : String(answer)
  }

  if (fieldType === 'date' || fieldType === 'datetime') {
    if (typeof answer === 'string') {
      return answer
    }
    return String(answer)
  }

  if (fieldType === 'multi_select' || fieldType === 'checkbox') {
    if (Array.isArray(answer)) {
      return answer.join('; ')
    }
    return String(answer)
  }

  return String(answer)
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins)

  console.log('[export-registrations-csv]', {
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

    console.log('[export-registrations-csv] env/auth check', {
      requestId,
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(supabaseServiceKey),
      hasAuthHeader: Boolean(authHeader),
      authHeaderPrefix: authHeader?.split(' ')[0] ?? null,
      authHeaderLength: authHeader?.length ?? 0,
    })

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
    const body = (await req.json()) as ExportRegistrationsRequest
    const { event_id } = body

    console.log('[export-registrations-csv] parsed body', {
      requestId,
      hasEventId: Boolean(event_id),
      eventId: maskValue(event_id ?? null),
    })

    if (!event_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing event_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Create authenticated client with user's token via Authorization header
    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Verify admin status by querying admins table - RLS will enforce access control
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const token = authHeader.replace('Bearer ', '')

    console.log('[export-registrations-csv] token extracted', {
      requestId,
      tokenLength: token.length,
      tokenPrefix: maskValue(token),
      hasBearerPrefix: authHeader.startsWith('Bearer '),
    })

    // Decode JWT to get user_id without validation (just extract)
    let userId: string | null = null
    try {
      const parts = token.split('.')
      console.log('[export-registrations-csv] jwt parts', {
        requestId,
        partsCount: parts.length,
      })
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        userId = payload.sub
        console.log('[export-registrations-csv] jwt decoded', {
          requestId,
          userId: maskValue(typeof userId === 'string' ? userId : null),
        })
      }
    } catch (e) {
      console.error('[export-registrations-csv] failed to decode JWT', {
        requestId,
        error: e instanceof Error ? e.message : String(e),
      })
    }

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if user is admin using the authenticated client
    const { data: adminRecord, error: adminCheckError } = await authClient
      .from('admins')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    console.log('[export-registrations-csv] admin check result', {
      requestId,
      userId: maskValue(userId),
      hasAdminRecord: Boolean(adminRecord),
      adminCheckErrorCode: adminCheckError?.code ?? null,
      adminCheckErrorMessage: adminCheckError?.message ?? null,
    })

    if (adminCheckError || !adminRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Create service role client for privileged operations after auth check
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch all registrations for the event
    const { data: registrations, error: regError } = await adminClient
      .from('registrations')
      .select('id, user_id, status, submitted_at, updated_at')
      .eq('event_id', event_id)
      .order('submitted_at', { ascending: false })

    console.log('[export-registrations-csv] registration query result', {
      requestId,
      eventId: maskValue(event_id),
      registrationCount: registrations?.length ?? 0,
      regErrorCode: regError?.code ?? null,
    })

    if (regError) {
      console.error('Registration fetch error:', regError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch registrations',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch user details for all registrations
    const userIds = registrations?.map((r) => r.user_id) ?? []
    const { data: users, error: userError } = await adminClient
      .from('users')
      .select('id, member_id, full_name, email, phone')
      .in('id', userIds)

    if (userError) {
      console.error('User fetch error:', userError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch user data',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch all event fields for this event in display order
    const { data: fields, error: fieldError } = await adminClient
      .from('event_fields')
      .select('id, field_key, label, field_type')
      .eq('event_id', event_id)
      .order('display_order', { ascending: true })

    if (fieldError) {
      console.error('Field fetch error:', fieldError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch event fields',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch all registration answers for all registrations
    const regIds = registrations?.map((r) => r.id) ?? []
    const { data: allAnswers, error: answerError } = await adminClient
      .from('registration_answers')
      .select(
        'registration_id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json',
      )
      .in('registration_id', regIds)

    if (answerError) {
      console.error('Answer fetch error:', answerError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch registration answers',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Build lookup maps for efficient access
    const userMap = new Map(users?.map((u) => [u.id, u]) ?? [])
    const fieldMap = new Map(fields?.map((f) => [f.id, f]) ?? [])
    const answersByRegistration = new Map<string, Map<string, unknown>>()

    allAnswers?.forEach((answer) => {
      if (!answersByRegistration.has(answer.registration_id)) {
        answersByRegistration.set(answer.registration_id, new Map())
      }

      const field = fieldMap.get(answer.event_field_id)
      let answerValue: unknown = null

      if (field) {
        // submit-registration stores all answers in answer_text (JSON string for complex fields)
        const rawAnswer = answer.answer_text
        if (rawAnswer === null || rawAnswer === undefined || rawAnswer === '') {
          answerValue = null
        } else if (
          field.field_type === 'select' ||
          field.field_type === 'radio' ||
          field.field_type === 'multi_select' ||
          field.field_type === 'checkbox'
        ) {
          try {
            answerValue = JSON.parse(rawAnswer)
          } catch {
            answerValue = rawAnswer
          }
        } else if (field.field_type === 'number') {
          const parsed = Number(rawAnswer)
          answerValue = Number.isNaN(parsed) ? rawAnswer : parsed
        } else if (field.field_type === 'boolean') {
          answerValue = rawAnswer === 'true' || rawAnswer === '1'
        } else {
          answerValue = rawAnswer
        }
      }

      answersByRegistration.get(answer.registration_id)?.set(answer.event_field_id, answerValue)
    })

    // Build CSV content
    const headers: string[] = [
      'member_id',
      'full_name',
      'email',
      'phone',
      'status',
      'submitted_at',
      'updated_at',
    ]
    fields?.forEach((f) => {
      headers.push(`${f.label} (${f.field_key})`)
    })

    const csvLines: string[] = [headers.map((h) => escapeCsvField(h)).join(',')]

    registrations?.forEach((reg) => {
      const user = userMap.get(reg.user_id)
      const row: string[] = [
        escapeCsvField(user?.member_id ?? ''),
        escapeCsvField(user?.full_name ?? ''),
        escapeCsvField(user?.email ?? ''),
        escapeCsvField(user?.phone ?? ''),
        escapeCsvField(reg.status),
        escapeCsvField(reg.submitted_at),
        escapeCsvField(reg.updated_at),
      ]

      fields?.forEach((f) => {
        const answer = answersByRegistration.get(reg.id)?.get(f.id)
        const formatted = formatAnswerValue(answer, f.field_type)
        row.push(escapeCsvField(formatted))
      })

      csvLines.push(row.join(','))
    })

    const csvContent = csvLines.join('\n')

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="registrations-${event_id}.csv"`,
      },
    })
  } catch (error) {
    console.error('[export-registrations-csv] unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
