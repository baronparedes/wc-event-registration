import { Check, Copy } from 'lucide-react';

import {
  Button,
  Dialog,
  ImageCanvas,
  ImageCanvasActions,
  useImageCanvasGroup,
} from '@/components/ui';
import type { DashboardStatsResponse } from '@/hooks/domain/services';
import { isMobileDevice } from '@/lib/infrastructure';

import { ServiceDashboardShareCard } from './ServiceDashboardShareCard';

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
  const exportFilename = 'service-dashboard-metrics.jpg';

  const canvases = useImageCanvasGroup<'main'>({
    getFilename: () => exportFilename,
    messages: {
      downloadSuccess: 'Dashboard image downloaded',
      downloadError: 'Failed to download dashboard image',
      shareFallbackSuccess: 'Dashboard image downloaded',
      shareError: 'Failed to share dashboard image',
      copySuccess: () => 'Dashboard image copied to clipboard',
      copyGenerateError: () => 'Failed to generate dashboard image',
    },
  });

  if (!isOpen || !stats) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="3xl">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Share Dashboard Metrics</Dialog.Title>
        <Dialog.Description>
          {isMobile
            ? 'Copy image to clipboard or share directly to your apps.'
            : 'Copy image to clipboard or download high-resolution graphic.'}
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body scrollable className="max-h-[calc(85vh-9rem)]">
        <div className="flex flex-col gap-4">
          {/* Scrollable Preview Area */}
          <div className="flex w-full justify-center overflow-x-auto rounded-xl border border-border bg-slate-50 p-2 sm:p-5">
            <div className="shrink-0 scale-[0.6] sm:scale-[0.8] origin-top">
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
          <ImageCanvas canvasRef={canvases.getRef('main')} hidden width={EXPORT_WIDTH_PX}>
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
              copied: canvases.copiedKey === 'main',
              copy: () => canvases.copy('main'),
              share: () => canvases.share(['main']),
            }}
            actions={['copy', 'share']}
            labels={{ copy: 'Copy Image', share: 'Share Image', copied: 'Copied Image' }}
            buttonClassName="w-full sm:w-auto"
          />
        ) : (
          <ImageCanvasActions
            controller={{
              isGenerating: canvases.isGenerating,
              download: () => canvases.download(['main']),
            }}
            actions={['download']}
            labels={{ download: 'Download Image' }}
            buttonClassName="w-full sm:w-auto"
          >
            <Button
              onClick={() => canvases.copy('main')}
              disabled={canvases.isGenerating}
              className="w-full sm:w-auto"
            >
              {canvases.copiedKey === 'main' ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-300" />
                  Copied Image
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {canvases.isGenerating ? 'Copying...' : 'Copy Image'}
                </>
              )}
            </Button>
          </ImageCanvasActions>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
