import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  enforcePublicRateLimit,
  isOriginAllowed,
  readAllowedOrigins,
} from '@/shared/security.ts'
import { POSTGRES_ERROR_CODES, RATE_LIMIT_PRESETS } from '@/shared/constants.ts'

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
  errors?: FieldValidationError[]
}

interface FieldValidationError {
  fieldKey: string
  message: string
}

interface EventFieldWithValidation {
  id: string
  field_key: string
  label: string
  field_type: string
  is_required: boolean
  options: { label: string; value: string }[]
  validation_rules: Record<string, unknown>
}

interface PostgrestErrorLike {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

const REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT = 'registrations_event_user_unique_idx'
const REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT =
  'registrations_event_idempotency_unique_idx'

/**
 * Validates a single field value against its schema and validation rules.
 * Returns validation error if invalid, null if valid.
 */
function validateFieldValue(
  fieldKey: string,
  value: unknown,
  field: EventFieldWithValidation,
): FieldValidationError | null {
  const label = field.label || fieldKey
  const rules = field.validation_rules || {}

  // Check required field
  if (field.is_required && (value === null || value === undefined || value === '')) {
    return { fieldKey, message: `${label} is required.` }
  }

  // Optional empty values are valid (don't validate further)
  if (!field.is_required && (value === null || value === undefined || value === '')) {
    return null
  }

  const type = field.field_type

  // Text-like fields (text, textarea, email, phone)
  if (type === 'text' || type === 'textarea' || type === 'email' || type === 'phone') {
    if (typeof value !== 'string') {
      return { fieldKey, message: `${label} must be text.` }
    }

    const text = value.trim()

    // Check length constraints
    const minLength = rules.min_length
    if (minLength !== undefined && typeof minLength === 'number') {
      if (text.length < minLength) {
        return {
          fieldKey,
          message: `${label} must be at least ${minLength} characters.`,
        }
      }
    }

    const maxLength = rules.max_length
    if (maxLength !== undefined && typeof maxLength === 'number') {
      if (text.length > maxLength) {
        return {
          fieldKey,
          message: `${label} must be at most ${maxLength} characters.`,
        }
      }
    }

    // Check pattern constraint
    if (rules.pattern && typeof rules.pattern === 'string') {
      try {
        const regex = new RegExp(rules.pattern)
        if (!regex.test(text)) {
          return { fieldKey, message: `${label} format is invalid.` }
        }
      } catch {
        // Ignore invalid regex patterns
      }
    }

    // Type-specific format checks
    if (type === 'email' && !isValidEmail(text)) {
      return { fieldKey, message: `${label} must be a valid email address.` }
    }

    if (type === 'phone' && !isValidPhone(text)) {
      return { fieldKey, message: `${label} must be a valid phone number.` }
    }

    return null
  }

  // Number field
  if (type === 'number') {
    let num: number

    if (typeof value === 'number') {
      num = value
    } else if (typeof value === 'string') {
      const parsed = Number(value)
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        num = parsed
      } else {
        return { fieldKey, message: `${label} must be a valid number.` }
      }
    } else {
      return { fieldKey, message: `${label} must be a number.` }
    }

    const min = rules.min
    if (min !== undefined && typeof min === 'number') {
      if (num < min) {
        return { fieldKey, message: `${label} must be at least ${min}.` }
      }
    }

    const max = rules.max
    if (max !== undefined && typeof max === 'number') {
      if (num > max) {
        return { fieldKey, message: `${label} must be at most ${max}.` }
      }
    }

    return null
  }

  // Single choice fields (select, radio)
  if (type === 'select' || type === 'radio') {
    if (typeof value !== 'string') {
      return { fieldKey, message: `${label} must be text.` }
    }

    const allowedValues = new Set(field.options.map((opt) => opt.value))
    if (!allowedValues.has(value)) {
      return { fieldKey, message: `${label} contains an unsupported option.` }
    }

    return null
  }

  // Boolean field (checkbox single)
  if (type === 'boolean') {
    if (
      typeof value !== 'boolean' &&
      value !== 'true' &&
      value !== 'false' &&
      value !== 0 &&
      value !== 1
    ) {
      return { fieldKey, message: `${label} must be true or false.` }
    }

    return null
  }

  // Multi-select field
  if (type === 'multi_select') {
    let arr: string[]

    if (Array.isArray(value)) {
      arr = value.map(String)
    } else if (typeof value === 'string') {
      arr = [value]
    } else {
      return { fieldKey, message: `${label} must be an array of values.` }
    }

    const allowedValues = new Set(field.options.map((opt) => opt.value))
    for (const item of arr) {
      if (!allowedValues.has(item)) {
        return { fieldKey, message: `${label} contains an unsupported option.` }
      }
    }

    const minSelections = rules.min_selections
    if (minSelections !== undefined && typeof minSelections === 'number') {
      if (arr.length < minSelections) {
        return {
          fieldKey,
          message: `${label} requires at least ${minSelections} selection(s).`,
        }
      }
    }

    const maxSelections = rules.max_selections
    if (maxSelections !== undefined && typeof maxSelections === 'number') {
      if (arr.length > maxSelections) {
        return {
          fieldKey,
          message: `${label} allows at most ${maxSelections} selection(s).`,
        }
      }
    }

    return null
  }

  // Multi-select + Yes/No toggle field
  if (type === 'multi_select_toggle') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { fieldKey, message: `${label} must be an object of option values.` }
    }

    const mapped = value as Record<string, unknown>
    const selectedKeys = Object.keys(mapped)
    const allowedValues = new Set(field.options.map((opt) => opt.value))

    for (const key of selectedKeys) {
      if (!allowedValues.has(key)) {
        return { fieldKey, message: `${label} contains an unsupported option.` }
      }

      if (typeof mapped[key] !== 'boolean') {
        return { fieldKey, message: `${label} selections must be Yes/No values.` }
      }
    }

    const minSelections = rules.min_selections
    if (minSelections !== undefined && typeof minSelections === 'number') {
      if (selectedKeys.length < minSelections) {
        return {
          fieldKey,
          message: `${label} requires at least ${minSelections} selection(s).`,
        }
      }
    }

    const maxSelections = rules.max_selections
    if (maxSelections !== undefined && typeof maxSelections === 'number') {
      if (selectedKeys.length > maxSelections) {
        return {
          fieldKey,
          message: `${label} allows at most ${maxSelections} selection(s).`,
        }
      }
    }

    return null
  }

  // Date field
  if (type === 'date' || type === 'datetime') {
    if (typeof value !== 'string') {
      return { fieldKey, message: `${label} must be a date string.` }
    }

    const isDateOnly = type === 'date'
    const dateRegex = isDateOnly ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

    if (!dateRegex.test(value)) {
      return {
        fieldKey,
        message: `${label} must use a valid ${isDateOnly ? 'date' : 'date and time'} format.`,
      }
    }

    const minDate = rules.min_date
    if (minDate && typeof minDate === 'string') {
      if (value < minDate) {
        return { fieldKey, message: `${label} must be on or after ${minDate}.` }
      }
    }

    const maxDate = rules.max_date
    if (maxDate && typeof maxDate === 'string') {
      if (value > maxDate) {
        return { fieldKey, message: `${label} must be on or before ${maxDate}.` }
      }
    }

    return null
  }

  return null
}

/**
 * Simple email validation using basic regex.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Simple phone validation - must contain digits.
 */
function isValidPhone(phone: string): boolean {
  return /\d/.test(phone)
}

function isUniqueConstraintError(error: PostgrestErrorLike | null, constraint: string): boolean {
  if (!error || error.code !== POSTGRES_ERROR_CODES.uniqueViolation) {
    return false
  }

  const combinedMessage = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`
  return combinedMessage.includes(constraint)
}

function isRegistrationUniqueConflict(error: PostgrestErrorLike | null): boolean {
  return (
    isUniqueConstraintError(error, REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT) ||
    isUniqueConstraintError(error, REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT)
  )
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

  const rateLimitResponse = enforcePublicRateLimit({
    req,
    origin,
    corsHeaders,
    scope: 'submit-registration',
    windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
    maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
  })

  if (rateLimitResponse) {
    return rateLimitResponse
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
          error: 'Failed to process registration',
          error_code: 'EVENT_LOOKUP_FAILED',
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
          error: 'Failed to process registration',
          error_code: 'USER_LOOKUP_FAILED',
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

    // Step 3: Insert registration first, then recover from unique conflicts.
    let registrationId: string | null = null
    let status: 'submitted' | 'updated' = 'submitted'
    let isNew = true
    let shouldWriteAnswers = true

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

    if (!createError && newReg) {
      registrationId = newReg.id
    } else if (createError && isRegistrationUniqueConflict(createError as PostgrestErrorLike)) {
      const isIdempotencyConflict = isUniqueConstraintError(
        createError as PostgrestErrorLike,
        REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT,
      )

      if (isIdempotencyConflict) {
        const { data: existingByIdempotency, error: idempotencyLookupError } = await supabase
          .from('registrations')
          .select('id, user_id, status')
          .eq('event_id', eventId)
          .eq('idempotency_key', idempotency_key)
          .maybeSingle()

        if (idempotencyLookupError) {
          console.error('Idempotency recovery lookup error:', idempotencyLookupError)
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_IDEMPOTENCY_RECOVERY_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }

        if (existingByIdempotency?.id && existingByIdempotency.user_id === userId) {
          registrationId = existingByIdempotency.id
          status = existingByIdempotency.status === 'updated' ? 'updated' : 'submitted'
          isNew = false
          shouldWriteAnswers = false
        }
      }

      if (!registrationId) {
        const { data: existingReg, error: regCheckError } = await supabase
          .from('registrations')
          .select('id, status')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle()

        if (regCheckError) {
          console.error('Registration conflict recovery check error:', regCheckError)
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_CHECK_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }

        if (!existingReg) {
          console.error(
            'Registration conflict recovery failed: row missing after unique conflict',
            {
              eventId,
              userId,
              idempotencyKey: idempotency_key,
            },
          )
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_CONFLICT_RECOVERY_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }

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

        registrationId = existingReg.id
        status = 'updated'
        isNew = false

        const { error: updateError } = await supabase
          .from('registrations')
          .update({ status: 'updated', submitted_at: new Date().toISOString() })
          .eq('id', registrationId)

        if (updateError) {
          console.error('Registration update error:', updateError)
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_UPDATE_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }
      }
    } else {
      console.error('Registration create error:', createError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'REGISTRATION_CREATE_FAILED',
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!registrationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'REGISTRATION_RESOLUTION_FAILED',
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!shouldWriteAnswers) {
      return new Response(
        JSON.stringify({
          success: true,
          registration_id: registrationId,
          status,
          is_new: isNew,
          message:
            status === 'updated'
              ? 'Registration updated successfully'
              : 'Registration submitted successfully',
        } as SubmitRegistrationSuccess),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Step 4: Get event fields with validation rules
    const { data: eventFields, error: fieldsError } = await supabase
      .from('event_fields')
      .select('id, field_key, label, field_type, is_required, options, validation_rules')
      .eq('event_id', eventId)
      .eq('is_active', true)

    if (fieldsError) {
      console.error('Fields lookup error:', fieldsError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'FIELDS_LOOKUP_FAILED',
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Step 5: Validate all response values against field schemas
    const fieldMap = new Map(
      (eventFields || []).map((f) => [f.field_key, f as EventFieldWithValidation]),
    )
    const validationErrors: FieldValidationError[] = []

    for (const [fieldKey, value] of Object.entries(responses)) {
      const field = fieldMap.get(fieldKey)
      if (!field) {
        // Unknown field in responses - skip (could be old data)
        continue
      }

      const error = validateFieldValue(fieldKey, value, field)
      if (error) {
        validationErrors.push(error)
      }
    }

    // Check for missing required fields
    for (const [fieldKey, field] of fieldMap) {
      if (field.is_required && !(fieldKey in responses)) {
        validationErrors.push({
          fieldKey,
          message: `${field.label} is required.`,
        })
      }
    }

    if (validationErrors.length > 0) {
      console.warn('Registration validation failed:', validationErrors)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          error_code: 'VALIDATION_FAILED',
          errors: validationErrors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Step 6: Delete existing answers if updating (clean slate)
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

    // Step 7: Insert registration answers
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
            error: 'Failed to process registration',
            error_code: 'ANSWERS_INSERT_FAILED',
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

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process registration',
        error_code: 'INTERNAL_ERROR',
      } as SubmitRegistrationError),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
