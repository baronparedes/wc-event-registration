import { useState } from 'react';

import { Calendar, Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';

import { Badge } from '@/components/ui';
import { useAdminEventsQuery } from '@/hooks/domain/events';
import type { AdminEvent } from '@/lib/domain/events';

interface BroadcastEventPickerProps {
  id?: string;
  value?: string;
  onChange: (eventId: string, event: AdminEvent | null) => void;
  error?: string;
}

export function BroadcastEventPicker({
  id = 'targetEventId',
  value,
  onChange,
  error,
}: BroadcastEventPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useAdminEventsQuery({
    pageSize: 30,
    searchTerm,
  });

  const events = data?.pages.flatMap((page) => page.items) ?? [];
  const selectedEvent = events.find((e) => e.id === value);

  const handleSelect = (event: AdminEvent) => {
    onChange(event.id, event);
    setIsOpen(false);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider text-muted"
      >
        Target Event <span className="text-destructive">*</span>
      </label>

      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border bg-background text-left transition-all ${
            error
              ? 'border-destructive ring-1 ring-destructive/30'
              : isOpen
                ? 'border-primary ring-1 ring-primary/30'
                : 'border-border hover:border-border/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            {selectedEvent ? (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text truncate">{selectedEvent.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {selectedEvent.starts_at && <span>{formatDate(selectedEvent.starts_at)}</span>}
                  <span className="capitalize text-[11px] font-medium text-primary">
                    ({selectedEvent.status})
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-sm text-muted">Select an event...</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-border bg-surface p-2 shadow-lg animate-in fade-in-0 zoom-in-95">
            {/* Search filter */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events by name..."
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>

            {/* Event list */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-muted">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs">Loading events...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">No events found</div>
              ) : (
                events.map((event) => {
                  const isSelected = event.id === value;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => handleSelect(event)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-background text-text'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted">
                          {event.starts_at && <span>{formatDate(event.starts_at)}</span>}
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
