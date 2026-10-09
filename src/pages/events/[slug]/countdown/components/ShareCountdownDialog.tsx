import { useEffect, useMemo, useState } from 'react';

import { Check, Link2 } from 'lucide-react';

import { Button, Dialog, ImageCanvas } from '@/components/ui';
import { toRoute } from '@/config/constants';
import { type AdminEvent, getEventCoverPublicUrl } from '@/lib/domain/events';
import { isMobileDevice } from '@/lib/infrastructure';

import { formatCountdownFilename, generateQrCodeDataUrl } from '../utils';
import { CountdownShareCard, type TimeLeft } from './CountdownShareCard';

export type ShareCountdownDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  event: AdminEvent | null;
  coverUrl?: string | null;
  timeLeft?: TimeLeft;
};

const EXPORT_WIDTH_PX = 560;

function calculateTimeLeft(startsAt: string | null | undefined, now = Date.now()): TimeLeft {
  if (!startsAt) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const timeDifference = new Date(startsAt).getTime() - now;
  if (timeDifference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(timeDifference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((timeDifference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((timeDifference / 1000 / 60) % 60),
    seconds: Math.floor((timeDifference / 1000) % 60),
  };
}

export function ShareCountdownDialog({
  isOpen,
  onClose,
  event,
  coverUrl,
  timeLeft: propTimeLeft,
}: ShareCountdownDialogProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (propTimeLeft || !isOpen || !event?.starts_at) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [propTimeLeft, isOpen, event?.starts_at]);

  const calculatedTimeLeft = useMemo(
    () => calculateTimeLeft(event?.starts_at, now),
    [event?.starts_at, now],
  );
  const resolvedTimeLeft = propTimeLeft ?? calculatedTimeLeft;
  const resolvedCoverUrl =
    coverUrl !== undefined ? coverUrl : getEventCoverPublicUrl(event?.cover_image_key);

  useEffect(() => {
    if (!event?.slug) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const eventUrl = `${origin}${toRoute('eventCountdown', { slug: event.slug })}`;

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
        downloadSuccess: 'Countdown image saved',
        downloadError: 'Failed to save countdown image',
        copySuccess: 'Countdown image copied to clipboard',
        copyGenerateError: 'Failed to generate countdown image',
        shareFallbackSuccess: 'Countdown image downloaded',
        shareError: 'Failed to generate shareable image',
      }}
    >
      <Dialog isOpen={isOpen} onClose={onClose} size="2xl">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Share Event Countdown</Dialog.Title>
          <Dialog.Description>
            {isMobile
              ? 'Share high-resolution countdown card directly to your apps'
              : 'Download or copy the countdown image to share across platforms'}
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body>
          <div className="flex flex-col items-center gap-4">
            {/* Responsive Card Preview Container */}
            <div className="flex w-full max-w-full justify-center overflow-hidden rounded-2xl border border-border bg-slate-50 p-2 sm:p-6">
              <div className="w-full max-w-[560px] overflow-hidden">
                <CountdownShareCard
                  event={event}
                  coverUrl={resolvedCoverUrl}
                  timeLeft={resolvedTimeLeft}
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
                  const { toast } = await import('sonner');
                  toast.success('Countdown link copied to clipboard');
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
              <CountdownShareCard
                event={event}
                coverUrl={resolvedCoverUrl}
                timeLeft={resolvedTimeLeft}
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
