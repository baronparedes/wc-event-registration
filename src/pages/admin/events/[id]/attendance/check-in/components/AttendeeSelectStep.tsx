import { useEffect, useRef } from 'react';

import { Check, Users } from 'lucide-react';

import { Button, EmptyState } from '@/components/ui';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { WizardStep } from '@/components/ui/WizardStep';
import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';

type AttendeeSelectStepProps = {
  results: AttendeeSearchResult[];
  selectedResultId: string | null;
  selectedAttendee: AttendeeSearchResult | null;
  searchError?: Error | null;
  onSelect: (registrationId: string) => void;
  onConfirmSelection: () => void;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
};

export function AttendeeSelectStep(props: AttendeeSelectStepProps) {
  const {
    results,
    selectedResultId,
    selectedAttendee,
    searchError,
    onSelect,
    onConfirmSelection,
    inactivityTimeoutMs,
    onInactivityTimeout,
  } = props;

  const checkedInBadgeClass =
    'inline-flex items-center rounded-full border border-emerald-950/30 bg-emerald-800 px-4 py-1.5 text-sm font-semibold text-white shadow-none';
  const readyBadgeClass =
    'inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white';
  const lastAutoConfirmedRegistrationId = useRef<string | null>(null);

  useEffect(() => {
    if (results.length !== 1) {
      lastAutoConfirmedRegistrationId.current = null;
      return;
    }

    const onlyResultId = results[0].registration_id;
    if (!selectedResultId || selectedResultId !== onlyResultId) {
      return;
    }

    if (lastAutoConfirmedRegistrationId.current === onlyResultId) {
      return;
    }

    lastAutoConfirmedRegistrationId.current = onlyResultId;
    onConfirmSelection();
  }, [onConfirmSelection, results, selectedResultId]);

  return (
    <WizardStep
      title="Step 2: Select Matching Attendee"
      subtitle="Choose the correct attendee from the results before check-in."
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      inactivityTimerMessage={(s) => `Returning to Step 1 in ${s}s if this step is not completed.`}
    >
      <div className="space-y-4">
        {searchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {searchError instanceof Error ? searchError.message : 'Failed to search attendees.'}
          </div>
        )}

        {results.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No attendees found"
              description="Try a member ID, name fragment, or email from a registered or public attendee."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 lg:hidden">
              {results.map((result) => {
                const isSelected = result.registration_id === selectedResultId;
                return (
                  <button
                    key={result.registration_id}
                    type="button"
                    onClick={() => onSelect(result.registration_id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-blue-50 shadow-md'
                        : 'border-border bg-surface hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-2xl font-semibold text-text">{result.full_name}</p>
                      <span
                        className={
                          result.check_in_status === 'checked_in'
                            ? checkedInBadgeClass
                            : readyBadgeClass
                        }
                      >
                        {result.check_in_status === 'checked_in' ? 'Checked In' : 'Ready'}
                      </span>
                    </div>
                    <p className="mt-2 text-base text-muted">
                      Member ID: {result.member_id ?? '—'}
                    </p>
                    <p className="text-base text-muted">
                      Checked In At:{' '}
                      {result.official_check_in_time
                        ? formatDateTime(result.official_check_in_time)
                        : '—'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="hidden rounded-2xl border border-border bg-surface lg:block overflow-x-auto">
              <ListTable className="text-lg">
                <ListTableHead>
                  <ListTableHeaderRow className="text-base normal-case tracking-normal">
                    <ListTableHeaderCell className="px-6">Attendee</ListTableHeaderCell>
                    <ListTableHeaderCell>Member ID</ListTableHeaderCell>
                    <ListTableHeaderCell>Status</ListTableHeaderCell>
                    <ListTableHeaderCell>Checked In At</ListTableHeaderCell>
                    <ListTableHeaderCell></ListTableHeaderCell>
                  </ListTableHeaderRow>
                </ListTableHead>
                <ListTableBody>
                  {results.map((result) => {
                    const isSelected = result.registration_id === selectedResultId;
                    return (
                      <ListTableRow
                        key={result.registration_id}
                        className={isSelected ? 'bg-blue-50' : undefined}
                        onClick={() => onSelect(result.registration_id)}
                      >
                        <ListTableCell className="px-6 text-xl font-semibold text-text">
                          {result.full_name}
                        </ListTableCell>
                        <ListTableCell>
                          <span className="font-mono text-base text-muted">
                            {result.member_id ?? '—'}
                          </span>
                        </ListTableCell>
                        <ListTableCell>
                          <span
                            className={
                              result.check_in_status === 'checked_in'
                                ? checkedInBadgeClass
                                : readyBadgeClass
                            }
                          >
                            {result.check_in_status === 'checked_in' ? 'Checked In' : 'Ready'}
                          </span>
                        </ListTableCell>
                        <ListTableCell>
                          {result.official_check_in_time
                            ? formatDateTime(result.official_check_in_time)
                            : '—'}
                        </ListTableCell>
                        <ListTableCell
                          className="text-center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            aria-label={isSelected ? 'Selected attendee' : 'Select attendee'}
                            title={isSelected ? 'Selected' : 'Select attendee'}
                            onClick={() => onSelect(result.registration_id)}
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                              isSelected
                                ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
                                : 'border-border bg-surface text-muted hover:border-primary/60 hover:text-primary'
                            }`}
                          >
                            <Check className="h-7 w-7" />
                            <span className="sr-only">
                              {isSelected ? 'Selected attendee' : 'Select attendee'}
                            </span>
                          </button>
                        </ListTableCell>
                      </ListTableRow>
                    );
                  })}
                </ListTableBody>
              </ListTable>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            fullWidth={true}
            size="lg"
            onClick={onConfirmSelection}
            disabled={!selectedResultId}
          >
            {selectedAttendee ? (
              <span className="flex flex-col items-center leading-tight">
                <span>Confirm Selection</span>
                <span>({selectedAttendee.full_name})</span>
              </span>
            ) : (
              'Confirm Selection'
            )}
          </Button>
        </div>
      </div>
    </WizardStep>
  );
}
