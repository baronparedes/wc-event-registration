import { useRef, useState } from 'react';

import { toJpeg } from 'html-to-image';
import { Clock, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Dialog } from '@/components/ui';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import { type ExcusedMemberMap, toIsoDateKey } from '@/lib/domain/hub-calendar';

import { groupEntriesByPrimaryRole } from '../utils';
import { SundayScheduleShareCard } from './SundayScheduleShareCard';

const TIME_SLOTS: { slot: TimeSlot; label: string; fileSuffix: string }[] = [
  { slot: '9AM', label: '9:00 AM', fileSuffix: '9am' },
  { slot: '12NN', label: '12:00 NN', fileSuffix: '12nn' },
  { slot: '3PM', label: '3:00 PM', fileSuffix: '3pm' },
];

function formatScheduleDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

type ShareSundayScheduleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  monthIndex: number;
  dayNumber: number;
  entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]>;
  excusedMap?: ExcusedMemberMap;
};

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0]?.split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1] || '');
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function ShareSundayScheduleDialog({
  isOpen,
  onClose,
  year,
  monthIndex,
  dayNumber,
  entriesByTimeSlot,
  excusedMap,
}: ShareSundayScheduleDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const hiddenCardRefs = {
    '9AM': useRef<HTMLDivElement>(null),
    '12NN': useRef<HTMLDivElement>(null),
    '3PM': useRef<HTMLDivElement>(null),
  };

  if (!isOpen) return null;

  const isoDateKey = toIsoDateKey(year, monthIndex + 1, dayNumber);
  const formattedDate = formatScheduleDate(year, monthIndex, dayNumber);

  const totalVolunteers =
    (entriesByTimeSlot['9AM']?.length || 0) +
    (entriesByTimeSlot['12NN']?.length || 0) +
    (entriesByTimeSlot['3PM']?.length || 0);

  const generateDataUrlFromRef = async (element: HTMLDivElement | null): Promise<string | null> => {
    if (!element) return null;
    return toJpeg(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    });
  };

  const generateFilesAndDataUrls = async (): Promise<{
    files: File[];
    dataUrls: { url: string; suffix: string }[];
  }> => {
    const files: File[] = [];
    const dataUrls: { url: string; suffix: string }[] = [];

    for (const { slot, fileSuffix } of TIME_SLOTS) {
      const el = hiddenCardRefs[slot].current;
      const dataUrl = await generateDataUrlFromRef(el);
      if (!dataUrl) continue;

      dataUrls.push({ url: dataUrl, suffix: fileSuffix });
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], `sunday-schedule-${isoDateKey}-${fileSuffix}.jpg`, {
        type: 'image/jpeg',
      });
      files.push(file);
    }

    return { files, dataUrls };
  };

  const handleShareImages = async () => {
    try {
      setIsGenerating(true);
      const { files, dataUrls } = await generateFilesAndDataUrls();
      if (files.length === 0) return;

      if (navigator.canShare && navigator.canShare({ files })) {
        try {
          await navigator.share({ files });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === 'AbortError') {
            return;
          }
        }
      }

      // If multi-file share isn't supported on device, try sharing files sequentially
      if (isIOSDevice() && navigator.canShare) {
        for (const file of files) {
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file] });
            } catch (shareError) {
              if (shareError instanceof DOMException && shareError.name === 'AbortError') {
                return;
              }
            }
          }
        }
        return;
      }

      // Fallback download for all images
      for (const { url, suffix } of dataUrls) {
        const link = document.createElement('a');
        link.download = `sunday-schedule-${isoDateKey}-${suffix}.jpg`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      toast.success('Schedule images downloaded');
    } catch (error) {
      console.error('Error generating schedule images:', error);
      toast.error('Failed to generate schedule images');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Share Sunday Schedule</Dialog.Title>
        <Dialog.Description>
          Share high-resolution schedule images for all Sunday services
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="rounded-xl border border-border bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Schedule Date
                </span>
                <h3 className="text-base font-bold text-text">{formattedDate}</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <Users className="h-4 w-4" />
                {totalVolunteers} Total Volunteer{totalVolunteers === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Service Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted px-0.5">
              Service Breakdown
            </span>
            <div className="divide-y divide-border rounded-xl border border-border bg-surface">
              {TIME_SLOTS.map(({ slot, label }) => {
                const entries = entriesByTimeSlot[slot] || [];
                const roleSections = groupEntriesByPrimaryRole(entries);
                return (
                  <div key={slot} className="flex items-center justify-between p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-text">{label} Service</div>
                        <div className="text-xs text-muted">
                          {entries.length === 0
                            ? 'No volunteers scheduled'
                            : `${roleSections.length} role group${roleSections.length === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {entries.length} volunteer{entries.length === 1 ? '' : 's'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted">
            Sharing will generate 3 high-resolution images (9:00 AM, 12:00 NN, and 3:00 PM).
          </p>

          {/* Offscreen mounted elements for multi-export */}
          <div
            className="fixed -left-[9999px] top-0 pointer-events-none -z-50 w-[960px]"
            style={{ position: 'fixed', left: '-9999px', top: 0, width: '960px' }}
            aria-hidden="true"
          >
            {TIME_SLOTS.map(({ slot, label }) => (
              <div
                key={slot}
                ref={hiddenCardRefs[slot]}
                style={{ width: '960px' }}
                className="w-[960px] bg-white"
              >
                <SundayScheduleShareCard
                  slot={slot}
                  slotLabel={label}
                  formattedDate={formattedDate}
                  isoDateKey={isoDateKey}
                  entries={entriesByTimeSlot[slot] || []}
                  excusedMap={excusedMap}
                />
              </div>
            ))}
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="primaryOutline" onClick={onClose} disabled={isGenerating}>
          Cancel
        </Button>
        <Button onClick={handleShareImages} disabled={isGenerating}>
          <Share2 className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Share'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
