import { FileText, Share } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button } from '@/components/ui';
import type { AdminForm } from '@/lib/domain/forms';

type FormCardProps = {
  form: AdminForm;
};

/**
 * Displays a single form card with title, status, and description.
 * Used in the hub page to show available forms.
 */
export function FormCard({ form }: FormCardProps) {
  const navigate = useNavigate();
  // Using generic pattern for now as requested
  const submitPath = `/forms/${form.slug}`;
  const shareUrl = new URL(submitPath, window.location.origin).toString();
  const isOpen = form.status === 'published';

  const handleCardClick = () => {
    if (!isOpen) {
      return;
    }

    navigate(submitPath);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(submitPath);
    }
  };

  const handleShareClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const canUseNativeShare =
      typeof navigator.share === 'function' &&
      (!navigator.canShare || navigator.canShare({ url: shareUrl }));

    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: form.title,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // Ignore user-cancelled native share and avoid showing fallback errors.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Form link copied to clipboard.');
    } catch {
      toast.error('Failed to share form link.');
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] ${isOpen ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={isOpen ? 'link' : undefined}
      tabIndex={isOpen ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-text flex items-start gap-2">
          <FileText className="h-5 w-5 shrink-0 text-muted mt-0.5" aria-hidden="true" />
          <span>{form.title}</span>
        </h3>
        <div className="flex items-start gap-2 shrink-0">
          <Badge variant="success">Open</Badge>
          {isOpen && (
            <div>
              <Button
                aria-label={`Share ${form.title}`}
                onClick={handleShareClick}
                size="sm"
                variant="primaryOutline"
              >
                <Share className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {form.description && <p className="line-clamp-2 text-sm text-muted">{form.description}</p>}

      {isOpen && (
        <Button asChild className="mt-auto inline-flex items-center justify-center" size="md">
          <Link to={submitPath}>Fill out</Link>
        </Button>
      )}
    </div>
  );
}
