import { useState } from 'react';

import { Check, Clock, Copy, Users } from 'lucide-react';

import {
  Button,
  Dialog,
  ImageCanvas,
  ImageCanvasActions,
  useImageCanvasGroup,
} from '@/components/ui';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import { type ExcusedMemberMap, toIsoDateKey } from '@/lib/domain/hub-calendar';
import { isMobileDevice } from '@/lib/infrastructure';

import { groupEntriesByPrimaryRole } from '../utils';
import { SundayScheduleShareCard } from './SundayScheduleShareCard';

const TIME_SLOTS: { slot: TimeSlot; label: string; fileSuffix: string }[] = [
  { slot: '9AM', label: '9:00 AM', fileSuffix: '9am' },
  { slot: '12NN', label: '12:00 NN', fileSuffix: '12nn' },
  { slot: '3PM', label: '3:00 PM', fileSuffix: '3pm' },
];

const ALL_SLOTS: TimeSlot[] = TIME_SLOTS.map(({ slot }) => slot);
const EXPORT_WIDTH_PX = 960;

function getSlotConfig(slot: TimeSlot) {
  return TIME_SLOTS.find((s) => s.slot === slot);
}

function getSlotLabel(slot: TimeSlot): string {
  return getSlotConfig(slot)?.label || slot;
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

export function ShareSundayScheduleDialog({
  isOpen,
  onClose,
  year,
  monthIndex,
  dayNumber,
  entriesByTimeSlot,
  excusedMap,
}: ShareSundayScheduleDialogProps) {
  const defaultSlot =
    TIME_SLOTS.find((s) => (entriesByTimeSlot[s.slot]?.length || 0) > 0)?.slot || '9AM';
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>(defaultSlot);

  const isMobile = isMobileDevice();
  const isoDateKey = toIsoDateKey(year, monthIndex + 1, dayNumber);
  const formattedDate = formatScheduleDate(year, monthIndex, dayNumber);

  const canvases = useImageCanvasGroup<TimeSlot>({
    getFilename: (slot) =>
      `sunday-schedule-${isoDateKey}-${getSlotConfig(slot)?.fileSuffix ?? slot}.jpg`,
    messages: {
      downloadSuccess: 'Schedule images downloaded',
      downloadError: 'Failed to download schedule images',
      shareFallbackSuccess: 'Schedule images downloaded',
      shareError: 'Failed to generate schedule images',
      copySuccess: (slot) => `${getSlotLabel(slot)} schedule image copied to clipboard`,
      copyGenerateError: (slot) => `Failed to generate ${getSlotLabel(slot)} schedule image`,
    },
  });

  const totalVolunteers =
    (entriesByTimeSlot['9AM']?.length || 0) +
    (entriesByTimeSlot['12NN']?.length || 0) +
    (entriesByTimeSlot['3PM']?.length || 0);

  if (!isOpen) return null;

  const selectedSlotLabel = getSlotLabel(selectedSlot);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Share Sunday Schedule</Dialog.Title>
        <Dialog.Description>
          {isMobile
            ? 'Copy schedule images to clipboard or share graphics for all Sunday services'
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
                const isSelected = selectedSlot === slot;
                const isCopied = canvases.copiedKey === slot;

                return (
                  <div
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`flex items-center justify-between p-3.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-slate-50/70'
                    }`}
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
                            void canvases.copy(slot);
                          }}
                          disabled={canvases.isGenerating}
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
              ? 'Tap a service to select it for copying, or tap Share to share all services.'
              : 'Click any service to select it, or use the Copy buttons to paste directly into Slack or messaging apps.'}
          </p>

          {/* Offscreen mounted canvases for multi-export */}
          {TIME_SLOTS.map(({ slot, label }) => (
            <ImageCanvas
              key={slot}
              canvasRef={canvases.getRef(slot)}
              hidden
              width={EXPORT_WIDTH_PX}
            >
              <SundayScheduleShareCard
                slot={slot}
                slotLabel={label}
                formattedDate={formattedDate}
                isoDateKey={isoDateKey}
                entries={entriesByTimeSlot[slot] || []}
                excusedMap={excusedMap}
              />
            </ImageCanvas>
          ))}
        </div>
      </Dialog.Body>

      <Dialog.Footer className="w-full flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
        <Button
          variant="primaryOutline"
          onClick={onClose}
          disabled={canvases.isGenerating}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        {isMobile ? (
          <ImageCanvasActions
            controller={{
              isGenerating: canvases.isGenerating,
              copied: canvases.copiedKey === selectedSlot,
              copy: () => canvases.copy(selectedSlot),
              share: () => canvases.share(ALL_SLOTS),
            }}
            actions={['copy', 'share']}
            labels={{
              copy: `Copy ${selectedSlotLabel} Image`,
              copied: `Copied ${selectedSlotLabel}`,
              share: 'Share',
            }}
            buttonClassName="w-full sm:w-auto"
          />
        ) : (
          <ImageCanvasActions
            controller={{
              isGenerating: canvases.isGenerating,
              download: () => canvases.download(ALL_SLOTS),
            }}
            actions={['download']}
            labels={{ download: 'Download All' }}
            buttonClassName="w-full sm:w-auto"
          >
            <Button
              onClick={() => canvases.copy(selectedSlot)}
              disabled={canvases.isGenerating}
              className="w-full sm:w-auto"
            >
              {canvases.copiedKey === selectedSlot ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-300" />
                  Copied {selectedSlotLabel}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {canvases.isGenerating ? 'Copying...' : `Copy ${selectedSlotLabel} Image`}
                </>
              )}
            </Button>
          </ImageCanvasActions>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
