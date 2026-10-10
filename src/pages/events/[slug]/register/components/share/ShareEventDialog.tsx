import { useEffect, useState } from 'react';

import { Check, Link2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Dialog, ImageCanvas } from '@/components/ui';
import { toRoute } from '@/config/constants';
import { type AdminEvent, getEventCoverPublicUrl } from '@/lib/domain/events';
import { isMobileDevice } from '@/lib/infrastructure';
import {
  formatCountdownFilename,
  generateQrCodeDataUrl,
} from '@/pages/events/[slug]/register/utils/shareEventUtils';

import { EventShareCard } from './EventShareCard';

export type ShareEventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  event: AdminEvent | null;
  coverUrl?: string | null;
};

const EXPORT_WIDTH_PX = 560;

export function ShareEventDialog({ isOpen, onClose, event, coverUrl }: ShareEventDialogProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const resolvedCoverUrl =
    coverUrl !== undefined ? coverUrl : getEventCoverPublicUrl(event?.cover_image_key);

  useEffect(() => {
    if (!event?.slug) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const eventUrl = `${origin}${toRoute('eventRegister', { slug: event.slug })}`;

    let isMounted = true;
    generateQrCodeDataUrl(eventUrl)
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code data URL:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [event?.slug]);

  if (!event || !isOpen) return null;

  const isMobile = isMobileDevice();

  return (
    <ImageCanvas.Provider
      filename={formatCountdownFilename(event.slug)}
      messages={{
        downloadSuccess: 'Event registration image saved',
        downloadError: 'Failed to save event registration image',
        copySuccess: 'Event registration image copied to clipboard',
        copyGenerateError: 'Failed to generate event registration image',
        shareFallbackSuccess: 'Event registration image downloaded',
        shareError: 'Failed to generate shareable image',
      }}
    >
      <Dialog isOpen={isOpen} onClose={onClose} size="2xl">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Share Event</Dialog.Title>
          <Dialog.Description>
            {isMobile
              ? 'Share high-resolution event card directly to your apps'
              : 'Download or copy the event card to share across platforms'}
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body>
          <div className="flex flex-col items-center gap-4">
            {/* Responsive Card Preview Container */}
            <div className="flex w-full max-w-full justify-center overflow-hidden rounded-2xl border border-border bg-slate-50 p-2 sm:p-6">
              <div className="w-full max-w-[560px] overflow-hidden">
                <EventShareCard
                  event={event}
                  coverUrl={resolvedCoverUrl}
                  qrCodeDataUrl={qrCodeDataUrl}
                />
              </div>
            </div>

            <div className="flex w-full items-center justify-between px-1 text-xs text-muted">
              <span>High-resolution card preview</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  if (!url) return;
                  await navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                  toast.success('Event link copied to clipboard');
                }}
                className="h-7 text-xs text-muted hover:text-text"
              >
                {copiedLink ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    Link Copied
                  </>
                ) : (
                  <>
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    Copy Page Link
                  </>
                )}
              </Button>
            </div>

            {/* Offscreen mounted element for export (fixed width across mobile and desktop) */}
            <ImageCanvas hidden width={EXPORT_WIDTH_PX}>
              <EventShareCard
                event={event}
                coverUrl={resolvedCoverUrl}
                qrCodeDataUrl={qrCodeDataUrl}
              />
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
              labels={{ download: 'Download Image', share: 'Share' }}
              buttonClassName="w-full sm:w-auto"
            />
          )}
        </Dialog.Footer>
      </Dialog>
    </ImageCanvas.Provider>
  );
}
