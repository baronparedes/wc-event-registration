import { Check, Users } from 'lucide-react';

import { Badge, EmptyState } from '@/components/ui';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';

type ResultsListProps = {
  results: AttendeeSearchResult[];
  selectedRegistrationId: string | null;
  onSelect: (registrationId: string) => void;
};

export function ResultsList(props: ResultsListProps) {
  const { results, selectedRegistrationId, onSelect } = props;

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-12">
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No attendees found"
          description="Try a member ID, name fragment, or email from an active registration."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 lg:hidden">
        {results.map((result) => {
          const isSelected = result.registration_id === selectedRegistrationId;
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
                <Badge
                  variant={result.check_in_status === 'checked_in' ? 'closed' : 'open'}
                  className={
                    result.check_in_status === 'checked_in'
                      ? 'bg-green-600 text-white text-base px-5 py-2 font-semibold shadow-sm'
                      : 'text-sm px-4 py-1.5 font-semibold'
                  }
                >
                  {result.check_in_status === 'checked_in' ? 'Checked In' : 'Ready'}
                </Badge>
              </div>
              <p className="mt-2 text-base text-muted">Member ID: {result.member_id ?? '—'}</p>
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

      <div className="hidden rounded-2xl border border-border bg-surface lg:block">
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
              const isSelected = result.registration_id === selectedRegistrationId;
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
                    <Badge
                      variant={result.check_in_status === 'checked_in' ? 'closed' : 'open'}
                      className={
                        result.check_in_status === 'checked_in'
                          ? 'bg-green-600 text-white text-base px-5 py-2 font-semibold shadow-sm'
                          : 'text-sm px-4 py-1.5 font-semibold'
                      }
                    >
                      {result.check_in_status === 'checked_in' ? 'Checked In' : 'Ready'}
                    </Badge>
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
  );
}
