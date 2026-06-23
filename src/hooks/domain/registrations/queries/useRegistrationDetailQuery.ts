import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  AdminRegistrationDetail,
  RegistrationFieldResponse,
} from '@/lib/admin/registrationTypes'
import type { EventFieldType } from '@/lib/event-registration/types'

export const REGISTRATION_DETAIL_QUERY_KEY = (registrationId: string) =>
  ['registration-detail', registrationId] as const

/**
 * Fetches a single registration with full details including member info and all field responses.
 * Transforms answer columns into readable field responses with labels and types.
 */
export function useRegistrationDetailQuery(registrationId: string) {
  return useQuery({
    queryKey: REGISTRATION_DETAIL_QUERY_KEY(registrationId),
    queryFn: async (): Promise<AdminRegistrationDetail> => {
      // Fetch registration
      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('id, event_id, user_id, status, submitted_at, updated_at')
        .eq('id', registrationId)
        .single()

      if (regError) throw new Error('Registration not found')
      if (!registration) throw new Error('Registration not found')

      // Fetch user details
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, member_id, full_name, email, phone, nickname')
        .eq('id', registration.user_id)
        .single()

      if (userError) throw new Error('Member not found')
      if (!user) throw new Error('Member not found')

      // Fetch field responses with field metadata
      const { data: answers, error: answerError } = await supabase
        .from('registration_answers')
        .select(
          'id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json, event_fields(id, field_key, label, field_type, display_order)',
        )
        .eq('registration_id', registrationId)

      if (answerError) throw answerError

      // Type for answer with joined field metadata
      type AnswerWithFields = (typeof answers)[number] & {
        event_fields: {
          id: string
          field_key: string
          label: string
          field_type: string
          display_order: number
        } | null
      }

      // Transform answers into readable format
      const fieldResponses: RegistrationFieldResponse[] = ((answers as AnswerWithFields[]) ?? [])
        .sort((a, b) => {
          const aOrder = a.event_fields?.display_order ?? 0
          const bOrder = b.event_fields?.display_order ?? 0
          return aOrder - bOrder
        })
        .map((answer) => {
          const ef = answer.event_fields
          const fieldType = ef?.field_type

          // All answers are stored in answer_text (possibly as JSON for complex types)
          let answerValue: string | number | boolean | string[] | null
          const rawAnswer = answer.answer_text

          if (!rawAnswer) {
            answerValue = null
          } else if (
            fieldType === 'select' ||
            fieldType === 'radio' ||
            fieldType === 'multi_select' ||
            fieldType === 'checkbox'
          ) {
            // These are stored as JSON strings in answer_text
            try {
              answerValue = JSON.parse(rawAnswer)
            } catch {
              // If not valid JSON, treat as string
              answerValue = rawAnswer
            }
          } else if (fieldType === 'number') {
            // Try to parse as number
            const num = Number(rawAnswer)
            answerValue = isNaN(num) ? rawAnswer : num
          } else if (fieldType === 'boolean') {
            // Parse as boolean
            answerValue = rawAnswer === 'true' || rawAnswer === '1' || rawAnswer === true
          } else if (fieldType === 'date' || fieldType === 'datetime') {
            // Already a string, keep as-is
            answerValue = rawAnswer
          } else {
            // Default: treat as string
            answerValue = rawAnswer
          }

          return {
            field_id: answer.event_field_id,
            field_name: ef?.field_key ?? '',
            field_label: ef?.label ?? '',
            field_type: (fieldType ?? 'text') as EventFieldType,
            answer: answerValue,
          }
        })

      return {
        registration: {
          id: registration.id,
          event_id: registration.event_id,
          user_id: registration.user_id,
          status: registration.status,
          submitted_at: registration.submitted_at,
          updated_at: registration.updated_at,
        },
        member: {
          user_id: user.id,
          member_id: user.member_id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          nickname: user.nickname,
        },
        fieldResponses,
      }
    },
    staleTime: 0,
  })
}
