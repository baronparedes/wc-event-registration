import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Button, SearchInputField } from '@/components/ui';
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
          <div className="min-w-0 flex-1">
            <SearchInputField
              inputRef={searchInputRef}
              value={searchToken}
              autoComplete="off"
              disabled={disabled}
              ariaLabel="Search by RFID, name, or email"
              onChange={(event) => handleSearchTokenChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Search by RFID, name, or email..."
            />
          </div>

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
