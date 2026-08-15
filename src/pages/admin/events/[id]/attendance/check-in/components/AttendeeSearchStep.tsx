import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { WizardStep } from '@/components/ui/WizardStep';
import { useRfidAutoFocus } from '@/hooks/utils';

import { AttendeeLookupErrorAlert } from './AttendeeLookupErrorAlert';

type SearchResult = {
  registration_id: string;
  attendee_kind: 'registered' | 'public';
  public_registration_id?: string | null;
};

type AttendeeSearchStepProps = {
  searchToken: string;
  submittedSearchToken: string;
  notFoundActions?: ReactNode;
  disabled?: boolean;
  isSearching?: boolean;
  results?: SearchResult[];
  isSearchError?: boolean;
  onSearchTokenChange: (nextValue: string) => void;
  onSubmit: () => void;
};

export function AttendeeSearchStep(props: AttendeeSearchStepProps) {
  const {
    searchToken,
    submittedSearchToken,
    notFoundActions,
    disabled = false,
    isSearching = false,
    results = [],
    isSearchError = false,
    onSearchTokenChange,
    onSubmit,
  } = props;

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useRfidAutoFocus(searchInputRef, true);

  // Compute error message based on current conditions
  // Only show error if a search has been submitted (submittedSearchToken is set)
  const lookupErrorMessage =
    !isDismissed &&
    submittedSearchToken.trim().length > 0 &&
    !isSearching &&
    results.length === 0 &&
    !isSearchError
      ? `No attendees found matching "${submittedSearchToken}". Unregistered attendees must complete registration first.`
      : null;

  // Refocus input when error message appears (e.g. after failed search via button click)
  useEffect(() => {
    if (lookupErrorMessage) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    }
  }, [lookupErrorMessage]);

  const handleSearchTokenChange = (nextValue: string) => {
    onSearchTokenChange(nextValue);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  };

  const handleSubmit = () => {
    // Only reset dismissal flag when submitting a new search
    setIsDismissed(false);
    onSubmit();
  };

  return (
    <WizardStep
      title="Step 1: Find Attendee"
      subtitle="Scan RFID / Member ID or search by name / email."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search by RFID, name, or email</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchToken}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={disabled}
              onChange={(event) => handleSearchTokenChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Search by RFID, name, or email..."
              className="min-h-11 w-full rounded-md border border-border bg-background py-3 pl-11 pr-3 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>

          <Button
            type="button"
            size="md"
            className="sm:min-w-36"
            onClick={handleSubmit}
            disabled={disabled || !searchToken.trim().length || isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        <AttendeeLookupErrorAlert
          message={lookupErrorMessage}
          actions={notFoundActions}
          onDismiss={handleDismiss}
        />
      </div>
    </WizardStep>
  );
}
