import { useRef, useState } from 'react';

import { toBlob, toJpeg } from 'html-to-image';
import { Check, Copy, Download, Link2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Dialog } from '@/components/ui';
import type { AdminEvent } from '@/lib/domain/events';

import {
  dataUrlToBlob,
  ensureResourcesReady,
  formatCountdownFilename,
  isMobileDevice,
} from '../utils';
import { CountdownShareCard, type TimeLeft } from './CountdownShareCard';

export type ShareCountdownDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  event: AdminEvent | null;
  coverUrl?: string | null;
  timeLeft: TimeLeft;
};

export function ShareCountdownDialog({
  isOpen,
  onClose,
  event,
  coverUrl,
  timeLeft,
}: ShareCountdownDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!event || !isOpen) return null;

  const isMobile = isMobileDevice();
  const filename = formatCountdownFilename(event.slug);

  const generateDataUrl = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    await ensureResourcesReady(cardRef.current);
    return toJpeg(cardRef.current, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    });
  };

  const generatePngBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    await ensureResourcesReady(cardRef.current);
    return toBlob(cardRef.current, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      setIsGenerating(true);
      const dataUrl = await generateDataUrl();
      if (!dataUrl) return;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Countdown image saved');
    } catch (error) {
      console.error('Error saving countdown image:', error);
      toast.error('Failed to save countdown image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;

    try {
      setIsGenerating(true);
      const blob = await generatePngBlob();
      if (!blob) {
        toast.error('Failed to generate countdown image');
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
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
      toast.success('Countdown image copied to clipboard');
    } catch (error) {
      console.error('Error copying image to clipboard:', error);
      toast.error('Failed to copy image to clipboard');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (!url) return;

      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      toast.success('Countdown link copied to clipboard');
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      setIsGenerating(true);
      const dataUrl = await generateDataUrl();
      if (!dataUrl) return;

      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], filename, {
        type: 'image/jpeg',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: event.title,
            text: `Join us for ${event.title}!`,
          });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === 'AbortError') {
            return;
          }
        }
      }

      // Fallback to direct download
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Countdown image downloaded');
    } catch (error) {
      console.error('Error sharing countdown image:', error);
      toast.error('Failed to generate shareable image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
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
          {/* Card Preview Container */}
          <div className="flex w-full justify-center overflow-x-auto rounded-2xl border border-border bg-slate-50 p-4 sm:p-6">
            <div className="origin-top scale-90 sm:scale-100 transition-transform">
              <div ref={cardRef}>
                <CountdownShareCard event={event} coverUrl={coverUrl} timeLeft={timeLeft} />
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-between px-1 text-xs text-muted">
            <span>High-resolution card preview</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
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
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="primaryOutline" onClick={onClose} disabled={isGenerating}>
          Cancel
        </Button>

        {isMobile ? (
          <>
            <Button variant="outline" onClick={handleDownload} disabled={isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handleShare} disabled={isGenerating}>
              <Share2 className="mr-2 h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Share Image'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleCopyImage} disabled={isGenerating}>
              {copiedImage ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-600" />
                  Image Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Image
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              Download Image
            </Button>
            <Button onClick={handleShare} disabled={isGenerating}>
              <Share2 className="mr-2 h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Share'}
            </Button>
          </>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
