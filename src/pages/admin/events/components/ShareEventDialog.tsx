import { useRef, useState } from 'react';

import { toJpeg } from 'html-to-image';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Dialog } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';
import { formatDateTime } from '@/lib/infrastructure';

type ShareEventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  event: AdminEvent | null;
};

export function ShareEventDialog({ isOpen, onClose, event }: ShareEventDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!event) return null;

  const generateDataUrl = async () => {
    if (!cardRef.current) return null;
    return toJpeg(cardRef.current, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    });
  };

  const handleSave = async () => {
    if (!cardRef.current) return;

    try {
      setIsGenerating(true);
      const dataUrl = await generateDataUrl();
      if (!dataUrl) return;

      const link = document.createElement('a');
      link.download = `${event.slug || 'event'}-schedule.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success('Schedule image saved');
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save schedule image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      setIsGenerating(true);
      const dataUrl = await generateDataUrl();
      if (!dataUrl) return;

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${event.slug || 'event'}-schedule.jpg`, {
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
          // Non-abort errors fall through to download fallback
        }
      }

      // Fallback: download the image
      const link = document.createElement('a');
      link.download = `${event.slug || 'event'}-schedule.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success('Schedule image downloaded');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate schedule image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Share Schedule</Dialog.Title>
        <Dialog.Description>Generate a shareable image for {event.title}</Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <div className="flex justify-center rounded-xl border border-border bg-slate-50 p-4 sm:p-8">
          <div ref={cardRef} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-4 space-y-1 text-center">
              <h2 className="text-2xl font-bold text-slate-900">{event.title}</h2>
              {event.location && (
                <p className="text-sm font-medium text-slate-600">{event.location}</p>
              )}
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-700">Starts</p>
                  <p className="text-slate-600">
                    {event.starts_at ? formatDateTime(event.starts_at) : 'TBA'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Ends</p>
                  <p className="text-slate-600">
                    {event.ends_at ? formatDateTime(event.ends_at) : 'TBA'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-slate-400">
              <p>Generated via {LEGAL_CONFIG.appName}</p>
            </div>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="primaryOutline" onClick={onClose} disabled={isGenerating}>
          Cancel
        </Button>
        <Button variant="outline" onClick={handleSave} disabled={isGenerating}>
          <Download className="mr-2 h-4 w-4" />
          Save Image
        </Button>
        <Button onClick={handleShare} disabled={isGenerating}>
          <Share2 className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Share Image'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
