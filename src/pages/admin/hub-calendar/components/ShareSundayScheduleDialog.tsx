import { useRef, useState } from 'react';

import { toBlob, toJpeg } from 'html-to-image';
import { Check, Clock, Copy, Download, Share2, Users } from 'lucide-react';
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

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

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

async function ensureResourcesReady(element: HTMLElement): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness errors
    }
  }

  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      try {
        if ('decode' in img && typeof img.decode === 'function') {
          await img.decode();
        }
      } catch {
        // Ignore individual image decode errors
      }
    }),
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
  const [copiedSlot, setCopiedSlot] = useState<TimeSlot | null>(null);

  const defaultSlot =
    TIME_SLOTS.find((s) => (entriesByTimeSlot[s.slot]?.length || 0) > 0)?.slot || '9AM';
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>(defaultSlot);

  const ref9AM = useRef<HTMLDivElement>(null);
  const ref12NN = useRef<HTMLDivElement>(null);
  const ref3PM = useRef<HTMLDivElement>(null);

  const hiddenCardRefs: Record<TimeSlot, React.RefObject<HTMLDivElement | null>> = {
    '9AM': ref9AM,
    '12NN': ref12NN,
    '3PM': ref3PM,
  };

  const isMobile = isMobileDevice();
  const isoDateKey = toIsoDateKey(year, monthIndex + 1, dayNumber);
  const formattedDate = formatScheduleDate(year, monthIndex, dayNumber);

  const totalVolunteers =
    (entriesByTimeSlot['9AM']?.length || 0) +
    (entriesByTimeSlot['12NN']?.length || 0) +
    (entriesByTimeSlot['3PM']?.length || 0);

  const generateDataUrlFromRef = async (element: HTMLDivElement | null): Promise<string | null> => {
    if (!element) return null;
    await ensureResourcesReady(element);

    return toJpeg(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    });
  };

  const generatePngBlobFromRef = async (element: HTMLDivElement | null): Promise<Blob | null> => {
    if (!element) return null;
    await ensureResourcesReady(element);

    return toBlob(element, {
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
    const results = await Promise.all(
      TIME_SLOTS.map(async ({ slot, fileSuffix }) => {
        const el = hiddenCardRefs[slot].current;
        const dataUrl = await generateDataUrlFromRef(el);
        if (!dataUrl) return null;

        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], `sunday-schedule-${isoDateKey}-${fileSuffix}.jpg`, {
          type: 'image/jpeg',
        });
        return { file, dataUrl, suffix: fileSuffix };
      }),
    );

    const valid = results.filter(
      (r): r is { file: File; dataUrl: string; suffix: string } => r !== null,
    );

    return {
      files: valid.map((r) => r.file),
      dataUrls: valid.map((r) => ({ url: r.dataUrl, suffix: r.suffix })),
    };
  };

  const handleCopySlotImage = async (slot: TimeSlot) => {
    const slotConfig = TIME_SLOTS.find((s) => s.slot === slot);
    const label = slotConfig?.label || slot;

    try {
      setIsGenerating(true);
      const el = hiddenCardRefs[slot].current;
      const blob = await generatePngBlobFromRef(el);

      if (!blob) {
        toast.error(`Failed to generate ${label} schedule image`);
        return;
      }

      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        toast.error('Clipboard image copy is not supported in this browser');
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      setCopiedSlot(slot);
      setTimeout(() => setCopiedSlot(null), 2500);
      toast.success(`${label} schedule image copied to clipboard`);
    } catch (error) {
      console.error('Error copying schedule image to clipboard:', error);
      toast.error('Failed to copy image to clipboard');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsGenerating(true);
      const { dataUrls } = await generateFilesAndDataUrls();
      if (dataUrls.length === 0) return;

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
      console.error('Error downloading schedule images:', error);
      toast.error('Failed to download schedule images');
    } finally {
      setIsGenerating(false);
    }
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

  if (!isOpen) return null;

  const selectedSlotConfig = TIME_SLOTS.find((s) => s.slot === selectedSlot);
  const selectedSlotLabel = selectedSlotConfig?.label || selectedSlot;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Share Sunday Schedule</Dialog.Title>
        <Dialog.Description>
          {isMobile
            ? 'Share high-resolution schedule images for all Sunday services'
            : 'Copy schedule images to clipboard or download high-resolution graphics'}
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
            <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
              {TIME_SLOTS.map(({ slot, label }) => {
                const entries = entriesByTimeSlot[slot] || [];
                const roleSections = groupEntriesByPrimaryRole(entries);
                const isSelected = !isMobile && selectedSlot === slot;
                const isCopied = copiedSlot === slot;

                return (
                  <div
                    key={slot}
                    onClick={() => {
                      if (!isMobile) setSelectedSlot(slot);
                    }}
                    className={`flex items-center justify-between p-3.5 transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-slate-50/70'
                    } ${!isMobile ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text">{label} Service</span>
                          {isSelected && (
                            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted">
                          {entries.length === 0
                            ? 'No volunteers scheduled'
                            : `${roleSections.length} role group${roleSections.length === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {entries.length} volunteer{entries.length === 1 ? '' : 's'}
                      </span>
                      {!isMobile && (
                        <Button
                          type="button"
                          size="sm"
                          variant={isCopied ? 'secondary' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSlot(slot);
                            handleCopySlotImage(slot);
                          }}
                          disabled={isGenerating}
                          className="h-8 text-xs font-medium"
                          title={`Copy ${label} image to clipboard`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3.5 w-3.5" />
                              Copy
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted">
            {isMobile
              ? 'Sharing will generate 3 high-resolution images (9:00 AM, 12:00 NN, and 3:00 PM).'
              : 'Click any service to select it, or use the Copy buttons to paste directly into Slack or messaging apps.'}
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
        {isMobile ? (
          <Button onClick={handleShareImages} disabled={isGenerating}>
            <Share2 className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Share'}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleDownloadAll} disabled={isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              Download All
            </Button>
            <Button onClick={() => handleCopySlotImage(selectedSlot)} disabled={isGenerating}>
              {copiedSlot === selectedSlot ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-300" />
                  Copied {selectedSlotLabel}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Copying...' : `Copy ${selectedSlotLabel} Image`}
                </>
              )}
            </Button>
          </>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
