import type { HandlerResult, SupabaseClient } from '@/shared/handler.ts';
import type { EventFieldWithValidation } from '@/shared/validation.ts';

export interface PersistAnswersParams {
  registrationId: string;
  responses: Record<string, unknown>;
  fields: EventFieldWithValidation[];
  isNew: boolean;
}

export async function persistAnswers(
  supabase: SupabaseClient,
  params: PersistAnswersParams,
): Promise<HandlerResult<void>> {
  const { registrationId, responses, fields, isNew } = params;

  if (!isNew) {
    await supabase.from('registration_answers').delete().eq('registration_id', registrationId);
  }

  const fieldIdMap = new Map(fields.map((f) => [f.field_key, f.id]));

  const answersToInsert = Object.entries(responses)
    .map(([fieldKey, answer]) => {
      const fieldId = fieldIdMap.get(fieldKey);
      if (!fieldId) return null;
      return {
        registration_id: registrationId,
        event_field_id: fieldId,
        answer_text: typeof answer === 'string' ? answer : JSON.stringify(answer),
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  if (answersToInsert.length > 0) {
    const { error: answersError } = await supabase
      .from('registration_answers')
      .insert(answersToInsert);

    if (answersError) {
      return {
        ok: false,
        errorCode: 'ANSWERS_INSERT_FAILED',
        message: 'Failed to process registration',
        httpStatus: 500,
      };
    }
  }

  return { ok: true, data: undefined };
}
