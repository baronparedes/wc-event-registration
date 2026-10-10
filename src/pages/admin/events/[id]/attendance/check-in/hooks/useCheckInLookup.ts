import { useCallback, useMemo, useState } from 'react';

import type { CheckInResult } from '@/lib/domain/attendance';
import { searchAttendeesWithRfidFallback } from '@/lib/domain/attendance';

type CachedAttendees = NonNullable<
  ReturnType<typeof import('@/hooks/domain/attendance').useAttendeesLocalCacheQuery>['attendees']
>;

interface UseCheckInLookupOptions {
  cachedAttendees: CachedAttendees | null | undefined;
  onCheckInResultChange: (result: CheckInResult | null) => void;
}

export function useCheckInLookup({
  cachedAttendees,
  onCheckInResultChange,
}: UseCheckInLookupOptions) {
  const [searchToken, setSearchToken] = useState('');
  const [submittedSearchToken, setSubmittedSearchToken] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [confirmedRegistrationId, setConfirmedRegistrationId] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!submittedSearchToken.trim() || !cachedAttendees) return [];
    return searchAttendeesWithRfidFallback(cachedAttendees, submittedSearchToken);
  }, [cachedAttendees, submittedSearchToken]);

  const selectedResultId = useMemo(() => {
    if (selectedRegistrationId) {
      return results.some((result) => result.registration_id === selectedRegistrationId)
        ? selectedRegistrationId
        : null;
    }

    return results.length === 1 ? results[0].registration_id : null;
  }, [results, selectedRegistrationId]);

  const confirmedAttendee = useMemo(
    () => results.find((result) => result.registration_id === confirmedRegistrationId) ?? null,
    [confirmedRegistrationId, results],
  );

  const reset = useCallback(() => {
    setSearchToken('');
    setSubmittedSearchToken('');
    setSelectedRegistrationId(null);
    setConfirmedRegistrationId(null);
    onCheckInResultChange(null);
  }, [onCheckInResultChange]);

  const handleScanFromConfirmation = useCallback(
    (scanValue: string) => {
      const normalized = scanValue.trim();
      if (!normalized) return;

      setSearchToken(normalized);
      setSubmittedSearchToken(normalized);
      setSelectedRegistrationId(null);
      setConfirmedRegistrationId(null);
      onCheckInResultChange(null);
    },
    [onCheckInResultChange],
  );

  const handleSubmitSearch = useCallback(() => {
    const normalized = searchToken.trim();
    if (!normalized) return;

    setSubmittedSearchToken(normalized);
    setSelectedRegistrationId(null);
    setConfirmedRegistrationId(null);
    onCheckInResultChange(null);
  }, [onCheckInResultChange, searchToken]);

  const handleBackToMatches = useCallback(() => {
    setConfirmedRegistrationId(null);
    onCheckInResultChange(null);
  }, [onCheckInResultChange]);

  const handleConfirmSelection = useCallback(
    (registrationId: string) => {
      if (!registrationId) return;
      setConfirmedRegistrationId(registrationId);
      onCheckInResultChange(null);
    },
    [onCheckInResultChange],
  );

  return {
    searchToken,
    submittedSearchToken,
    selectedRegistrationId,
    confirmedRegistrationId,
    results,
    selectedResultId,
    confirmedAttendee,
    setSearchToken,
    setSubmittedSearchToken,
    setSelectedRegistrationId,
    setConfirmedRegistrationId,
    handleScanFromConfirmation,
    handleSubmitSearch,
    handleBackToLookup: reset,
    handleReadyForNext: reset,
    handleBackToMatches,
    handleConfirmSelection,
  };
}
