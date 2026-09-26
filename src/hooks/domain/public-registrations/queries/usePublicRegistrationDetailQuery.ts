import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { EventFieldType } from '@/lib/domain/event-fields';
import { fetchPublicRegistrationDetailRow } from '@/lib/domain/public-registrations';

export type PublicRegistrationFieldResponse = {
  field_id: string;
  field_name: string;
  field_label: string;
  field_type: EventFieldType;
  answer: string | number | boolean | string[] | null;
};

export type PublicRegistrationDetail = {
  registration: {
    id: string;
    event_id: string;
    first_name: string;
    last_name: string;
    nickname: string | null;
    email: string;
    phone: string | null;
    status: string;
    submitted_at: string;
    updated_at: string;
  };
  fieldResponses: PublicRegistrationFieldResponse[];
};

const PUBLIC_REGISTRATION_DETAIL_QUERY_KEY = (registrationId: string) =>
  ['public-registration-detail', registrationId] as const;

/**
 * Fetches one public registration record and its event-field responses for admin detail views.
 */
async function fetchPublicRegistrationDetail(
  registrationId: string,
): Promise<PublicRegistrationDetail> {
  const registration = await fetchPublicRegistrationDetailRow(registrationId);

  const answers = registration.public_registration_answers || [];

  const fieldResponses: PublicRegistrationFieldResponse[] = answers
    .sort((a, b) => {
      const aOrder = a.event_fields?.display_order ?? 0;
      const bOrder = b.event_fields?.display_order ?? 0;
      return aOrder - bOrder;
    })
    .map((answer) => {
      const ef = answer.event_fields;
      const fieldType = ef?.field_type;

      let answerValue: string | number | boolean | string[] | null;
      const rawAnswerText = answer.answer_text;
      const rawAnswerNumber = answer.answer_number;
      const rawAnswerBoolean = answer.answer_boolean;
      const rawAnswerDate = answer.answer_date;
      const rawAnswerJson = answer.answer_json;

      if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
        if (rawAnswerText === null || rawAnswerText === undefined || rawAnswerText === '') {
          answerValue = null;
        } else {
          try {
            answerValue = JSON.parse(rawAnswerText);
          } catch {
            answerValue = rawAnswerText;
          }
        }
      } else if (fieldType === 'multi_select' || fieldType === 'multi_select_toggle') {
        if (Array.isArray(rawAnswerJson)) {
          answerValue = rawAnswerJson as string[];
        } else if (rawAnswerJson !== null && rawAnswerJson !== undefined) {
          answerValue = String(rawAnswerJson);
        } else if (rawAnswerText === null || rawAnswerText === undefined || rawAnswerText === '') {
          answerValue = null;
        } else {
          try {
            answerValue = JSON.parse(rawAnswerText);
          } catch {
            answerValue = rawAnswerText;
          }
        }
      } else if (fieldType === 'number') {
        if (rawAnswerNumber !== null && rawAnswerNumber !== undefined) {
          answerValue = rawAnswerNumber;
        } else if (rawAnswerText === null || rawAnswerText === undefined || rawAnswerText === '') {
          answerValue = null;
        } else {
          const num = Number(rawAnswerText);
          answerValue = Number.isNaN(num) ? rawAnswerText : num;
        }
      } else if (fieldType === 'boolean') {
        if (rawAnswerBoolean !== null && rawAnswerBoolean !== undefined) {
          answerValue = rawAnswerBoolean;
        } else if (rawAnswerText === null || rawAnswerText === undefined || rawAnswerText === '') {
          answerValue = null;
        } else {
          answerValue = rawAnswerText === 'true' || rawAnswerText === '1';
        }
      } else if (fieldType === 'date') {
        if (rawAnswerDate !== null && rawAnswerDate !== undefined && rawAnswerDate !== '') {
          answerValue = rawAnswerDate;
        } else if (rawAnswerText !== null && rawAnswerText !== undefined && rawAnswerText !== '') {
          answerValue = rawAnswerText;
        } else {
          answerValue = null;
        }
      } else {
        answerValue = rawAnswerText === '' ? null : (rawAnswerText ?? null);
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
  };
}

export function usePublicRegistrationDetailQuery(
  registrationId?: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: PUBLIC_REGISTRATION_DETAIL_QUERY_KEY(registrationId ?? ''),
    queryFn: async () => {
      if (!registrationId) {
        throw new Error('Registration ID is required');
      }
      return fetchPublicRegistrationDetail(registrationId);
    },
    enabled: Boolean(registrationId) && (options?.enabled ?? true),
    staleTime: QUERY_STALE_TIME_MS.detail,
  });
}
