import { useState } from 'react';

import { CalendarPlus } from 'lucide-react';

import { Button, DropdownMenu, DropdownMenuItem } from '@/components/ui';
import type { AdminEvent } from '@/lib/domain/events';

import {
  downloadIcsFile,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  getYahooCalendarUrl,
} from '../utils/calendarExportUtils';

type AddToCalendarDropdownProps = {
  event: AdminEvent;
};

export function AddToCalendarDropdown({ event }: AddToCalendarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Button
          size="3xl"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <CalendarPlus className="h-5 w-5 mr-2" aria-hidden="true" />
          Add to Calendar
        </Button>
      }
    >
      <DropdownMenuItem
        onClick={() => {
          window.open(getGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
          setIsOpen(false);
        }}
      >
        Google Calendar
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          window.open(getOutlookCalendarUrl(event), '_blank', 'noopener,noreferrer');
          setIsOpen(false);
        }}
      >
        Outlook
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          window.open(getYahooCalendarUrl(event), '_blank', 'noopener,noreferrer');
          setIsOpen(false);
        }}
      >
        Yahoo
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          downloadIcsFile(event);
          setIsOpen(false);
        }}
      >
        Apple Calendar (.ics)
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
