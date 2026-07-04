import type { RefObject } from 'react';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/Button';

type SearchFormProps = {
  searchToken: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  isSearching?: boolean;
  onSearchTokenChange: (nextValue: string) => void;
  onSubmit: () => void;
};

export function SearchForm(props: SearchFormProps) {
  const {
    searchToken,
    inputRef,
    disabled = false,
    isSearching = false,
    onSearchTokenChange,
    onSubmit,
  } = props;

  const hasSearchToken = searchToken.trim().length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <p className="font-heading text-2xl font-semibold text-text">Step 1: Find Attendee</p>
      <label className="flex w-full flex-col gap-1 text-sm text-muted">
        Type RFID, full name, last name, or email
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            type="search"
            autoFocus
            value={searchToken}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={disabled}
            onChange={(event) => onSearchTokenChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSubmit();
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
          onClick={onSubmit}
          disabled={disabled || !hasSearchToken || isSearching}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </div>
  );
}
