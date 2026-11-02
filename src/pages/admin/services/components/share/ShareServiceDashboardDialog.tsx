import { Dialog, ImageCanvas } from '@/components/ui';
import type { DashboardStatsResponse } from '@/hooks/domain/services';
import { isMobileDevice } from '@/lib/infrastructure';

import { ServiceDashboardShareCard } from './ServiceDashboardShareCard';
import { getServiceDashboardExportFilename } from './utils';

export type ShareServiceDashboardDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  stats: DashboardStatsResponse;
  filterMode: 'sunday' | 'month' | 'annual';
  selectedSunday: string;
  selectedYear: number;
  selectedMonth: number;
};

const EXPORT_WIDTH_PX = 800;

export function ShareServiceDashboardDialog({
  isOpen,
  onClose,
  stats,
  filterMode,
  selectedSunday,
  selectedYear,
  selectedMonth,
}: ShareServiceDashboardDialogProps) {
  const isMobile = isMobileDevice();

  if (!isOpen || !stats) return null;

  const exportFilename = getServiceDashboardExportFilename(
    filterMode,
    selectedSunday,
    selectedYear,
    selectedMonth,
  );

  return (
    <ImageCanvas.Provider
      filename={exportFilename}
      messages={{
        downloadSuccess: 'Dashboard image saved',
        downloadError: 'Failed to save dashboard image',
        copySuccess: 'Dashboard image copied to clipboard',
        copyGenerateError: 'Failed to generate dashboard image',
        shareFallbackSuccess: 'Dashboard image downloaded',
        shareError: 'Failed to generate shareable image',
      }}
    >
      <Dialog isOpen={isOpen} onClose={onClose} size="4xl">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Share Dashboard Metrics</Dialog.Title>
          <Dialog.Description>
            {isMobile
              ? 'Share high-resolution dashboard card directly to your apps.'
              : 'Download or copy high-resolution graphic to share with your team.'}
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body scrollable className="max-h-[calc(85vh-9rem)]">
          <div className="flex flex-col gap-4">
            {/* Scrollable Preview Area */}
            <div className="flex w-full justify-center overflow-x-auto rounded-xl border border-border bg-surface-hover/30 p-2 sm:p-5">
              <div className="shrink-0">
                <ServiceDashboardShareCard
                  stats={stats}
                  filterMode={filterMode}
                  selectedSunday={selectedSunday}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                />
              </div>
            </div>

            {/* Offscreen mounted element for export */}
            <ImageCanvas hidden width={EXPORT_WIDTH_PX}>
              <ServiceDashboardShareCard
                stats={stats}
                filterMode={filterMode}
                selectedSunday={selectedSunday}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
              />
            </ImageCanvas>
          </div>
        </Dialog.Body>

        <Dialog.Footer className="w-full flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
          <ImageCanvas.CancelButton onClick={onClose} className="w-full sm:w-auto" />

          {isMobile ? (
            <ImageCanvas.Actions
              actions={['copy', 'share']}
              labels={{ copy: 'Copy Image', share: 'Share Image', copied: 'Copied Image' }}
              buttonClassName="w-full sm:w-auto"
            />
          ) : (
            <ImageCanvas.Actions
              actions={['copy', 'download', 'share']}
              labels={{
                copy: 'Copy Image',
                download: 'Download Image',
                share: 'Share',
                copied: 'Copied Image',
              }}
              buttonClassName="w-full sm:w-auto"
            />
          )}
        </Dialog.Footer>
      </Dialog>
    </ImageCanvas.Provider>
  );
}
