import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { EventFieldType } from '@/lib/domain/event-fields';
import {
  type AdminRegistrationDetail,
  type RegistrationFieldResponse,
  fetchRegistrationDetail,
} from '@/lib/domain/registrations';

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
      const registrationData = await fetchRegistrationDetail(registrationId);

      // `users` is many-to-one so it's typically a single object.
      const user = Array.isArray(registrationData.users)
        ? registrationData.users[0]
        : registrationData.users;
      if (!user) throw new Error('Member not found');

      const answers = registrationData.registration_answers || [];

      // Transform answers into readable format
      const fieldResponses: RegistrationFieldResponse[] = answers
        .slice()
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
            answerValue = Number.isNaN(num) ? rawAnswer : num;
          } else if (fieldType === 'boolean') {
            // Parse as boolean
            answerValue = rawAnswer === 'true' || rawAnswer === '1';
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
          id: registrationData.id,
          event_id: registrationData.event_id,
          user_id: registrationData.user_id,
          status: registrationData.status,
          submitted_at: registrationData.submitted_at,
          updated_at: registrationData.updated_at,
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
