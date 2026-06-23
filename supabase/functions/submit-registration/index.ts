import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
} from '../_shared/security.ts'

interface SubmitRegistrationRequest {
  event_slug: string
  member_id: string
  responses: Record<string, unknown>
  idempotency_key: string
}

interface SubmitRegistrationSuccess {
  success: true
  registration_id: string
  status: 'submitted' | 'updated'
  is_new: boolean
  message: string
}

interface SubmitRegistrationError {
  success: false
  error: string
  error_code?: string
  error_detail?: string
}

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
    const body = (await req.json()) as SubmitRegistrationRequest
    const { event_slug, member_id, responses, idempotency_key } = body

    // Validate required fields
    if (
      !event_slug ||
      typeof event_slug !== 'string' ||
      !member_id ||
      typeof member_id !== 'string' ||
      !responses ||
      typeof responses !== 'object' ||
      !idempotency_key ||
      typeof idempotency_key !== 'string'
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request: missing or invalid required fields',
          error_code: 'INVALID_REQUEST',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Create authenticated client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Step 1: Look up event by slug
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, duplicate_policy')
      .eq('slug', event_slug)
      .maybeSingle()

    if (eventError) {
      console.error('Event lookup error:', eventError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to lookup event',
          error_detail: eventError.message,
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!eventData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Event not found',
          error_code: 'EVENT_NOT_FOUND',
        } as SubmitRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Step 2: Look up user by member_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('member_id', member_id)
      .maybeSingle()

    if (userError) {
      console.error('User lookup error:', userError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to lookup user',
          error_detail: userError.message,
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Member not found',
          error_code: 'MEMBER_NOT_FOUND',
        } as SubmitRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const userId = userData.id
    const eventId = eventData.id
    const duplicatePolicy = eventData.duplicate_policy

    // Step 3: Check for existing registration
    const { data: existingReg, error: regCheckError } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()

    if (regCheckError) {
      console.error('Registration check error:', regCheckError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to check existing registration',
          error_detail: regCheckError.message,
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let registrationId: string
    let status: 'submitted' | 'updated' = 'submitted'
    let isNew = true

    if (existingReg) {
      // Duplicate registration found
      if (duplicatePolicy === 'block') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Already registered for this event',
            error_code: 'duplicate_blocked',
          } as SubmitRegistrationError),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // duplicate_policy === 'allow_update'
      registrationId = existingReg.id
      status = 'updated'
      isNew = false

      // Update registration
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: 'updated', submitted_at: new Date().toISOString() })
        .eq('id', registrationId)

      if (updateError) {
        console.error('Registration update error:', updateError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to update registration',
            error_detail: updateError.message,
          } as SubmitRegistrationError),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    } else {
      // Create new registration
      const { data: newReg, error: createError } = await supabase
        .from('registrations')
        .insert({
          event_id: eventId,
          user_id: userId,
          idempotency_key: idempotency_key,
          status: 'submitted',
          source: 'public',
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Registration create error:', createError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to create registration',
            error_detail: createError.message,
          } as SubmitRegistrationError),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      registrationId = newReg.id
    }

    // Step 4: Get event fields to map responses
    const { data: eventFields, error: fieldsError } = await supabase
      .from('event_fields')
      .select('id, field_key')
      .eq('event_id', eventId)
      .eq('is_active', true)

    if (fieldsError) {
      console.error('Fields lookup error:', fieldsError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to lookup event fields',
          error_detail: fieldsError.message,
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Step 5: Delete existing answers if updating (clean slate)
    if (!isNew) {
      const { error: deleteAnswersError } = await supabase
        .from('registration_answers')
        .delete()
        .eq('registration_id', registrationId)

      if (deleteAnswersError) {
        console.error('Delete answers error:', deleteAnswersError)
        // Continue - not fatal
      }
    }

    // Step 6: Insert registration answers
    const fieldIdMap = new Map((eventFields || []).map((f) => [f.field_key, f.id]))
    const answersToInsert = Object.entries(responses)
      .map(([fieldKey, answer]) => {
        const fieldId = fieldIdMap.get(fieldKey)
        if (!fieldId) {
          console.warn(`Field ${fieldKey} not found in event`)
          return null
        }

        // Simple type mapping: assume string for now
        return {
          registration_id: registrationId,
          event_field_id: fieldId,
          answer_text: typeof answer === 'string' ? answer : JSON.stringify(answer),
        }
      })
      .filter((a) => a !== null)

    if (answersToInsert.length > 0) {
      const { error: answersError } = await supabase
        .from('registration_answers')
        .insert(answersToInsert)

      if (answersError) {
        console.error('Answers insert error:', answersError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to save registration answers',
            error_detail: answersError.message,
          } as SubmitRegistrationError),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        registration_id: registrationId,
        status,
        is_new: isNew,
        message: isNew
          ? 'Registration submitted successfully'
          : 'Registration updated successfully',
      } as SubmitRegistrationSuccess),
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
        error_detail: message,
      } as SubmitRegistrationError),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
