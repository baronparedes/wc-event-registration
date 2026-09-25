import { FileText, Share } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button, MarkdownRenderer } from '@/components/ui';
import { toRoute } from '@/config/constants';
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
  const submitPath = toRoute('formSubmit', { slug: form.slug });
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
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-text flex items-start gap-2 min-w-0">
          <FileText className="h-5 w-5 shrink-0 text-muted mt-0.5" aria-hidden="true" />
          <span className="break-words">{form.title}</span>
        </h3>
        <div className="shrink-0">
          <Badge variant="default">Open</Badge>
        </div>
      </div>

      {form.description && (
        <MarkdownRenderer
          content={form.description}
          className="text-sm prose-p:text-muted prose-p:leading-relaxed"
        />
      )}

      {isOpen && (
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button
            asChild
            className="flex-1 inline-flex min-h-[44px] items-center justify-center font-semibold tracking-wide text-white shadow-xs"
            size="md"
          >
            <Link to={submitPath}>Fill out</Link>
          </Button>
          <Button
            aria-label={`Share ${form.title}`}
            onClick={handleShareClick}
            size="md"
            variant="primaryOutline"
            className="min-h-[44px] min-w-[44px] p-0 flex items-center justify-center shrink-0"
          >
            <Share className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
