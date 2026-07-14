import type { HandlerResult, SupabaseClient } from '@/shared/handler.ts';

export async function checkDuplicatePolicy(
  supabase: SupabaseClient,
  duplicatePolicy: string,
  eventId: string,
  userId: string,
): Promise<HandlerResult<void>> {
  if (duplicatePolicy !== 'block') {
    return { ok: true, data: undefined };
  }

  const { data: existing, error } = await supabase
    .from('registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      errorCode: 'REGISTRATION_CHECK_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  if (existing?.id) {
    return {
      ok: false,
      errorCode: 'duplicate_blocked',
      message: 'Already registered for this event',
      httpStatus: 200,
    };
  }

  return { ok: true, data: undefined };
}
