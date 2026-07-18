/* c8 ignore start */
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { RegistrantAttendanceRow } from '@/lib/domain/attendance';
import { supabase } from '@/lib/infrastructure';

const CACHE_KEY_PREFIX = 'wc:attendance-answers';

type LocalCacheEntry = {
  data: RegistrantAttendanceRow[];
  updatedAt: number;
};

function getStorageKey(eventId: string): string {
  return `${CACHE_KEY_PREFIX}:${eventId}`;
}

function readCache(eventId: string): LocalCacheEntry | null {
  try {
    const raw = localStorage.getItem(getStorageKey(eventId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalCacheEntry;
  } catch {
    return null;
  }
}

function writeCache(eventId: string, data: RegistrantAttendanceRow[]): void {
  try {
    localStorage.setItem(getStorageKey(eventId), JSON.stringify({ data, updatedAt: Date.now() }));
  } catch {
    // localStorage quota exceeded or unavailable — continue without persisting
  }
}

/**
 * Fetches all registrants for an event with their attendance field answers.
 * Used in the admin attendance data entry list.
 */
export function useAttendanceAnswersQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceAnswers(eventId),
    queryFn: async (): Promise<RegistrantAttendanceRow[]> => {
      if (!eventId) return [];

      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('id, user_id')
        .eq('event_id', eventId);

      if (regError) throw regError;

      const { data: publicRegistrations, error: publicRegError } = await supabase
        .from('public_registrations')
        .select('id, first_name, last_name, email, status')
        .eq('event_id', eventId);

      const safePublicRegistrations = publicRegError ? [] : (publicRegistrations ?? []);

      const memberRegistrations = registrations ?? [];
      const guestRegistrations = safePublicRegistrations.filter(
        (registration) => registration.status !== 'cancelled',
      );

      if (memberRegistrations.length === 0 && guestRegistrations.length === 0) return [];

      const userIds = memberRegistrations.map((r) => r.user_id as string);

      const users = userIds.length
        ? await supabase
            .from('users')
            .select('id, member_id, full_name, email')
            .in('id', userIds)
            .order('full_name', { ascending: true })
        : { data: [], error: null };

      if (users.error) throw users.error;

      const registrationIds = memberRegistrations.map((r) => r.id as string);
      const publicRegistrationIds = guestRegistrations.map((r) => r.id as string);

      const memberAnswers = registrationIds.length
        ? await supabase
            .from('attendance_answers')
            .select(
              'id, registration_id, attendance_field_id, answer_text, answer_number, created_at, updated_at',
            )
            .in('registration_id', registrationIds)
        : { data: [], error: null };

      if (memberAnswers.error) throw memberAnswers.error;

      const publicAnswers = publicRegistrationIds.length
        ? await supabase
            .from('public_attendance_answers')
            .select(
              'id, public_registration_id, attendance_field_id, answer_text, answer_number, created_at, updated_at',
            )
            .in('public_registration_id', publicRegistrationIds)
        : { data: [], error: null };

      const safePublicAnswers = publicAnswers.error ? [] : (publicAnswers.data ?? []);

      const regByUserId = new Map(
        memberRegistrations.map((r) => [r.user_id as string, r.id as string]),
      );

      const memberRows: RegistrantAttendanceRow[] = (users.data ?? []).map((user) => {
        const registrationId = regByUserId.get(user.id as string)!;
        return {
          attendee_kind: 'registered',
          registration_id: registrationId,
          public_registration_id: null,
          member_id: (user.member_id as string | null) ?? null,
          full_name: user.full_name as string,
          email: (user.email as string | null) ?? null,
          answers: (memberAnswers.data ?? [])
            .filter((a) => a.registration_id === registrationId)
            .map((answer) => ({
              ...answer,
              registration_id: answer.registration_id,
              public_registration_id: null,
            })),
        };
      });

      const publicRows: RegistrantAttendanceRow[] = guestRegistrations.map((registration) => {
        const firstName = String(registration.first_name ?? '').trim();
        const lastName = String(registration.last_name ?? '').trim();
        const fullName = `${firstName} ${lastName}`.trim() || 'Guest Attendee';

        return {
          attendee_kind: 'public',
          registration_id: null,
          public_registration_id: registration.id as string,
          member_id: null,
          full_name: fullName,
          email: (registration.email as string | null) ?? null,
          answers: safePublicAnswers
            .filter((a) => a.public_registration_id === registration.id)
            .map((answer) => ({
              ...answer,
              registration_id: null,
              public_registration_id: answer.public_registration_id,
            })),
        };
      });

      const result = [...memberRows, ...publicRows].sort((a, b) =>
        a.full_name.localeCompare(b.full_name),
      );

      if (eventId) writeCache(eventId, result);

      return result;
    },
    enabled: Boolean(eventId),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    initialData: () => (eventId ? (readCache(eventId)?.data ?? undefined) : undefined),
    initialDataUpdatedAt: () =>
      eventId ? (readCache(eventId)?.updatedAt ?? undefined) : undefined,
  });
}
/* c8 ignore stop */
