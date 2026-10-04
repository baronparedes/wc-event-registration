import { useRef, useState } from 'react';

import { toJpeg } from 'html-to-image';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Dialog } from '@/components/ui';
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

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      setIsGenerating(true);
      const dataUrl = await toJpeg(cardRef.current, { quality: 0.95, backgroundColor: '#ffffff' });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${event.slug}-schedule.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: event.title,
          text: `Join us for ${event.title}!`,
        });
      } else {
        // Fallback: download the image
        const link = document.createElement('a');
        link.download = `${event.slug}-schedule.jpg`;
        link.href = dataUrl;
        link.click();
        toast.success('Schedule image downloaded');
      }
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
          <div
            ref={cardRef}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            style={{ padding: '32px' }}
          >
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
                  <p className="text-slate-600">{formatDateTime(event.starts_at)}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Ends</p>
                  <p className="text-slate-600">{formatDateTime(event.ends_at)}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-slate-400">
              <p>Generated via WelcomeHub</p>
            </div>
          </div>
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="primaryOutline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleShare} disabled={isGenerating}>
          <Share2 className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Share Image'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
