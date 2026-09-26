import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { EventFieldType } from '@/lib/domain/event-fields';
import type {
  AdminRegistrationDetail,
  RegistrationFieldResponse,
} from '@/lib/domain/registrations';
import { supabase } from '@/lib/infrastructure';

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export const REGISTRATION_DETAIL_QUERY_KEY = (registrationId: string) =>
  ['registration-detail', registrationId] as const;

/**
 * Fetches a single registration with full details including member info and all field responses.
 * Transforms answer columns into readable field responses with labels and types.
 */
export function useRegistrationDetailQuery(registrationId: string) {
  return useQuery({
    queryKey: REGISTRATION_DETAIL_QUERY_KEY(registrationId),
    queryFn: async (): Promise<AdminRegistrationDetail> => {
      // Fetch registration with user and answers in a single query
      const { data, error } = await supabase
        .from('registrations')
        .select(
          `
          id, event_id, user_id, status, submitted_at, updated_at,
          users!inner(id, member_id, full_name, email, phone, nickname, role, category),
          registration_answers(
            id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json,
            event_fields(id, field_key, label, field_type, display_order)
          )
        `
        )
        .eq('id', registrationId)
        .single();

      if (error || !data) {
        throw new Error('Registration not found');
      }

      // `users` is many-to-one so it's typically a single object.
      // @ts-expect-error - Complex joined query types are hard to infer correctly
      const user = Array.isArray(data.users) ? data.users[0] : data.users;
      if (!user) throw new Error('Member not found');

      // @ts-expect-error - Complex joined query types are hard to infer correctly
      const answers = data.registration_answers || [];

      // Type for answer with joined field metadata
      type AnswerWithFields = (typeof answers)[number] & {
        event_fields: {
          id: string;
          field_key: string;
          label: string;
          field_type: string;
          display_order: number;
        } | null;
      };

      // Transform answers into readable format
      const fieldResponses: RegistrationFieldResponse[] = ((answers as AnswerWithFields[]) ?? [])
        .sort((a, b) => {
          const aOrder = a.event_fields?.display_order ?? 0;
          const bOrder = b.event_fields?.display_order ?? 0;
          return aOrder - bOrder;
        })
        .map((answer) => {
          const ef = answer.event_fields;
          const fieldType = ef?.field_type;

          // All answers are stored in answer_text (possibly as JSON for complex types)
          let answerValue: string | number | boolean | string[] | null;
          const rawAnswer = answer.answer_text;

          if (!rawAnswer) {
            answerValue = null;
          } else if (
            fieldType === 'select' ||
            fieldType === 'radio' ||
            fieldType === 'multi_select' ||
            fieldType === 'multi_select_toggle' ||
            fieldType === 'checkbox'
          ) {
            // These are stored as JSON strings in answer_text
            try {
              answerValue = JSON.parse(rawAnswer);
            } catch {
              // If not valid JSON, treat as string
              answerValue = rawAnswer;
            }
          } else if (fieldType === 'number') {
            // Try to parse as number
            const num = Number(rawAnswer);
            answerValue = isNaN(num) ? rawAnswer : num;
          } else if (fieldType === 'boolean') {
            // Parse as boolean
            answerValue = rawAnswer === 'true' || rawAnswer === '1' || rawAnswer === true;
          } else if (fieldType === 'date' || fieldType === 'datetime') {
            // Already a string, keep as-is
            answerValue = rawAnswer;
          } else {
            // Default: treat as string
            answerValue = rawAnswer;
          }

          return {
            field_id: answer.event_field_id,
            field_name: ef?.field_key ?? '',
            field_label: ef?.label ?? '',
            field_type: (fieldType ?? 'text') as EventFieldType,
            answer: answerValue,
          };
        });

      return {
        registration: {
          id: data.id,
          event_id: data.event_id,
          user_id: data.user_id,
          // @ts-expect-error - Complex joined query types are hard to infer correctly
          status: data.status,
          submitted_at: data.submitted_at,
          updated_at: data.updated_at,
        },
        member: {
          user_id: user.id,
          member_id: user.member_id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          nickname: user.nickname,
          role: readMetadataString(user.role),
          category: readMetadataString(user.category),
        },
        fieldResponses,
      };
    },
    staleTime: QUERY_STALE_TIME_MS.detail,
  });
}
