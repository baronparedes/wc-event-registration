import { useRef, useState } from 'react';

import { Info, Search } from 'lucide-react';

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
      ? `No attendees found matching "${submittedSearchToken}"`
      : null;

  const handleSearchTokenChange = (nextValue: string) => {
    onSearchTokenChange(nextValue);
  };

  const handleSubmit = () => {
    // Only reset dismissal flag when submitting a new search
    setIsDismissed(false);
    onSubmit();
  };

  return (
    <WizardStep
      title="Step 1: Find Attendee"
      subtitle="Scan RFID or search by name, last name, or email."
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="flex w-full flex-col gap-1 text-sm text-muted">
            Type RFID, full name, last name, or email
            <div className="relative">
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
                placeholder="Search by RFID, full name, last name, or email"
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-3 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>
          </label>

          <div className="w-full">
            <Button
              type="button"
              size="md"
              fullWidth={true}
              onClick={handleSubmit}
              disabled={disabled || !searchToken.trim().length || isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        <AttendeeLookupErrorAlert
          message={lookupErrorMessage}
          onDismiss={() => setIsDismissed(true)}
        />

        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
          <p>Start by scanning an RFID/member ID or enter a name/email, then tap Search.</p>
        </div>
      </div>
    </WizardStep>
  );
}
