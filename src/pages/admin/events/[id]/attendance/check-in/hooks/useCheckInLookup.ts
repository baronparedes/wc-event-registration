import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CheckInResult } from '@/lib/domain/attendance';
import { searchAttendeesWithRfidFallback } from '@/lib/domain/attendance';

import { isDirectMemberIdMatch } from '../utils';

type CachedAttendees = NonNullable<
  ReturnType<
    typeof import('@/hooks/domain/attendance/queries').useAttendeesLocalCacheQuery
  >['attendees']
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
  const lastAutoConfirmedTokenRef = useRef('');
  const lastAutoSubmittedTokenRef = useRef('');

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
    lastAutoConfirmedTokenRef.current = '';
    lastAutoSubmittedTokenRef.current = '';
  }, [onCheckInResultChange]);

  const handleScanFromConfirmation = useCallback(
    (scanValue: string) => {
      const normalized = scanValue.trim();
      if (!normalized) return;

      lastAutoConfirmedTokenRef.current = '';
      lastAutoSubmittedTokenRef.current = '';
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

  useEffect(() => {
    if (
      results.length === 1 &&
      isDirectMemberIdMatch(submittedSearchToken, results) &&
      lastAutoConfirmedTokenRef.current !== submittedSearchToken
    ) {
      lastAutoConfirmedTokenRef.current = submittedSearchToken;
      setConfirmedRegistrationId(results[0].registration_id);
      onCheckInResultChange(null);
    }
  }, [onCheckInResultChange, results, submittedSearchToken]);

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
    lastAutoSubmittedTokenRef,
  };
}
