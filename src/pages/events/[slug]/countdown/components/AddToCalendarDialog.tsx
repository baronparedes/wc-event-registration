import { useState } from 'react';

import { CalendarPlus } from 'lucide-react';
import { FaYahoo } from 'react-icons/fa';
import { PiMicrosoftOutlookLogoFill } from 'react-icons/pi';
import { SiApple, SiGooglecalendar } from 'react-icons/si';
import { twMerge } from 'tailwind-merge';

import { Button, Dialog } from '@/components/ui';
import type { AdminEvent } from '@/lib/domain/events';

import {
  downloadIcsFile,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  getYahooCalendarUrl,
} from '../utils/calendarExportUtils';

export type AddToCalendarDialogProps = {
  event: AdminEvent;
  className?: string;
};

export function AddToCalendarDialog({ event, className }: AddToCalendarDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="3xl"
        variant="primaryOutline"
        className={twMerge('w-full sm:w-auto', className)}
        onClick={() => setIsOpen(true)}
      >
        <CalendarPlus className="h-5 w-5 mr-2" aria-hidden="true" />
        Add to Calendar
      </Button>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Add to Calendar</Dialog.Title>
        </Dialog.Header>

        <Dialog.Body>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
            <Button
              variant="outline"
              className="flex h-auto flex-col items-center justify-center gap-3 p-6 hover:bg-slate-50 transition-colors"
              onClick={() => {
                window.open(getGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
                setIsOpen(false);
              }}
            >
              <SiGooglecalendar className="h-8 w-8 text-[#4285F4]" />
              <span className="font-semibold">Google Calendar</span>
            </Button>
            <Button
              variant="outline"
              className="flex h-auto flex-col items-center justify-center gap-3 p-6 hover:bg-slate-50 transition-colors"
              onClick={() => {
                window.open(getOutlookCalendarUrl(event), '_blank', 'noopener,noreferrer');
                setIsOpen(false);
              }}
            >
              <PiMicrosoftOutlookLogoFill className="h-8 w-8 text-[#0078D4]" />
              <span className="font-semibold">Outlook</span>
            </Button>
            <Button
              variant="outline"
              className="flex h-auto flex-col items-center justify-center gap-3 p-6 hover:bg-slate-50 transition-colors"
              onClick={() => {
                window.open(getYahooCalendarUrl(event), '_blank', 'noopener,noreferrer');
                setIsOpen(false);
              }}
            >
              <FaYahoo className="h-8 w-8 text-[#410093]" />
              <span className="font-semibold">Yahoo</span>
            </Button>
            <Button
              variant="outline"
              className="flex h-auto flex-col items-center justify-center gap-3 p-6 hover:bg-slate-50 transition-colors"
              onClick={() => {
                downloadIcsFile(event);
                setIsOpen(false);
              }}
            >
              <SiApple className="h-8 w-8 text-slate-800" />
              <span className="font-semibold">Apple Calendar (.ics)</span>
            </Button>
          </div>
        </Dialog.Body>
      </Dialog>
    </>
  );
}
