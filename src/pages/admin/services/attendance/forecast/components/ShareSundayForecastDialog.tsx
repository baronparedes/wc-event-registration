import { useMemo, useState } from 'react';

import { Dialog, ImageCanvas } from '@/components/ui';
import { isMobileDevice } from '@/lib/infrastructure';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';
import { SundayForecastShareCard } from './SundayForecastShareCard';

export type ShareSundayForecastDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  sundays: SundayForecastData[];
  initialSundayKey?: string;
  roleGroupLabel?: string;
};

const EXPORT_WIDTH_PX = 960;

export function ShareSundayForecastDialog({
  isOpen,
  onClose,
  sundays,
  initialSundayKey,
  roleGroupLabel,
}: ShareSundayForecastDialogProps) {
  // Default to the active Sunday tab or first upcoming Sunday
  const defaultKey = useMemo(() => {
    if (!sundays.length) return '';
    if (initialSundayKey && initialSundayKey !== 'ALL') {
      const match = sundays.find((s) => s.isoDateKey === initialSundayKey);
      if (match) return match.isoDateKey;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = sundays.find((s) => s.date >= today);
    return upcoming?.isoDateKey ?? sundays[0].isoDateKey;
  }, [sundays, initialSundayKey]);

  const [overrideKey, setOverrideKey] = useState<string | null>(null);

  const selectedSunday = useMemo(() => {
    const keyToFind =
      overrideKey && sundays.some((s) => s.isoDateKey === overrideKey) ? overrideKey : defaultKey;
    return sundays.find((s) => s.isoDateKey === keyToFind) ?? sundays[0];
  }, [sundays, overrideKey, defaultKey]);

  const isMobile = isMobileDevice();

  if (!isOpen || !selectedSunday) return null;

  const exportFilename = `attendance-forecast-${selectedSunday.isoDateKey}.jpg`;

  return (
    <ImageCanvas.Provider
      filename={exportFilename}
      messages={{
        downloadSuccess: 'Forecast image saved',
        downloadError: 'Failed to save forecast image',
        copySuccess: 'Forecast image copied to clipboard',
        copyGenerateError: 'Failed to generate forecast image',
        shareFallbackSuccess: 'Forecast image downloaded',
        shareError: 'Failed to generate shareable image',
      }}
    >
      <Dialog isOpen={isOpen} onClose={onClose} size="5xl">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Share Sunday Attendance Forecast</Dialog.Title>
          <Dialog.Description>
            {isMobile
              ? 'Share high-resolution forecast card directly to your apps'
              : 'Download or copy the forecast card to share across platforms'}
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body scrollable className="max-h-[calc(85vh-9rem)]">
          <div className="flex flex-col gap-4">
            {/* Sunday Selection Tabs (if multiple Sundays exist) */}
            {sundays.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
                <span className="text-xs font-semibold text-muted mr-1.5">Select Sunday:</span>
                {sundays.map((sunday) => {
                  const isSelected = sunday.isoDateKey === selectedSunday.isoDateKey;
                  return (
                    <button
                      key={sunday.isoDateKey}
                      type="button"
                      onClick={() => setOverrideKey(sunday.isoDateKey)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                        isSelected
                          ? 'bg-primary text-white font-semibold shadow-xs'
                          : 'bg-surface-hover/50 text-muted hover:bg-surface-hover hover:text-text'
                      }`}
                    >
                      <span>{sunday.ordinalLabel}</span>
                      <span className="text-[11px] opacity-80">({sunday.dayNumber})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scrollable Preview Area */}
            <div className="flex w-full justify-center overflow-x-auto rounded-xl border border-border bg-slate-50 p-2 sm:p-5">
              <div className="shrink-0">
                <SundayForecastShareCard sunday={selectedSunday} roleGroupLabel={roleGroupLabel} />
              </div>
            </div>

            {/* Offscreen mounted element for export */}
            <ImageCanvas hidden width={EXPORT_WIDTH_PX}>
              <SundayForecastShareCard sunday={selectedSunday} roleGroupLabel={roleGroupLabel} />
            </ImageCanvas>
          </div>
        </Dialog.Body>

        <Dialog.Footer className="w-full flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
          <ImageCanvas.CancelButton onClick={onClose} className="w-full sm:w-auto" />

          {isMobile ? (
            <ImageCanvas.Actions
              actions={['copy', 'share']}
              labels={{ copy: 'Copy Image', share: 'Share Image' }}
              buttonClassName="w-full sm:w-auto"
            />
          ) : (
            <ImageCanvas.Actions
              actions={['copy', 'download', 'share']}
              labels={{ copy: 'Copy Image', download: 'Download Image', share: 'Share' }}
              buttonClassName="w-full sm:w-auto"
            />
          )}
        </Dialog.Footer>
      </Dialog>
    </ImageCanvas.Provider>
  );
}
