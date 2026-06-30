import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/infrastructure'
import type { EventFieldType } from '@/lib/domain/event-fields'

export type PublicRegistrationFieldResponse = {
  field_id: string
  field_name: string
  field_label: string
  field_type: EventFieldType
  answer: string | number | boolean | string[] | null
}

export type PublicRegistrationDetail = {
  registration: {
    id: string
    event_id: string
    first_name: string
    last_name: string
    nickname: string | null
    email: string
    phone: string | null
    status: string
    submitted_at: string
    updated_at: string
  }
  fieldResponses: PublicRegistrationFieldResponse[]
}

export const PUBLIC_REGISTRATION_DETAIL_QUERY_KEY = (registrationId: string) =>
  ['public-registration-detail', registrationId] as const

/**
 * Fetches one public registration record and its event-field responses for admin detail views.
 */
export function usePublicRegistrationDetailQuery(registrationId: string) {
  return useQuery({
    queryKey: PUBLIC_REGISTRATION_DETAIL_QUERY_KEY(registrationId),
    queryFn: async (): Promise<PublicRegistrationDetail> => {
      const { data: registration, error: registrationError } = await supabase
        .from('public_registrations')
        .select(
          'id, event_id, first_name, last_name, nickname, email, phone, status, submitted_at, updated_at',
        )
        .eq('id', registrationId)
        .single()

      if (registrationError || !registration) {
        throw new Error('Public registration not found')
      }

      const { data: answers, error: answerError } = await supabase
        .from('public_registration_answers')
        .select(
          'id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json, event_fields(id, field_key, label, field_type, display_order)',
        )
        .eq('public_registration_id', registrationId)

      if (answerError) {
        throw answerError
      }

      type AnswerWithFields = (typeof answers)[number] & {
        event_fields: {
          id: string
          field_key: string
          label: string
          field_type: string
          display_order: number
        } | null
      }

      const fieldResponses: PublicRegistrationFieldResponse[] = (
        (answers as AnswerWithFields[]) ?? []
      )
        .sort((a, b) => {
          const aOrder = a.event_fields?.display_order ?? 0
          const bOrder = b.event_fields?.display_order ?? 0
          return aOrder - bOrder
        })
        .map((answer) => {
          const ef = answer.event_fields
          const fieldType = ef?.field_type

          let answerValue: string | number | boolean | string[] | null
          const rawAnswer = answer.answer_text

          if (!rawAnswer) {
            answerValue = null
          } else if (
            fieldType === 'select' ||
            fieldType === 'radio' ||
            fieldType === 'multi_select' ||
            fieldType === 'multi_select_toggle' ||
            fieldType === 'checkbox'
          ) {
            try {
              answerValue = JSON.parse(rawAnswer)
            } catch {
              answerValue = rawAnswer
            }
          } else if (fieldType === 'number') {
            const num = Number(rawAnswer)
            answerValue = Number.isNaN(num) ? rawAnswer : num
          } else if (fieldType === 'boolean') {
            answerValue = rawAnswer === 'true' || rawAnswer === '1' || rawAnswer === true
          } else {
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
          first_name: registration.first_name,
          last_name: registration.last_name,
          nickname: registration.nickname,
          email: registration.email,
          phone: registration.phone,
          status: registration.status,
          submitted_at: registration.submitted_at,
          updated_at: registration.updated_at,
        },
        fieldResponses,
      }
    },
    staleTime: 0,
  })
}
