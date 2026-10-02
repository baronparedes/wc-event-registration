import { useId, useState } from 'react';

import { ChevronDown, FileText, Share } from 'lucide-react';
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
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
    if (!isOpen || e.target !== e.currentTarget) {
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
      className={`group flex self-start flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${isOpen ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={isOpen ? 'link' : undefined}
      tabIndex={isOpen ? 0 : undefined}
    >
      <div className="flex flex-col gap-4 p-5 sm:min-h-[340px]">
        <div className="flex items-start justify-between gap-3">
          <FileText className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="default">Open</Badge>
            {form.description && (
              <button
                type="button"
                aria-label={`${detailsOpen ? 'Hide' : 'Show'} details for ${form.title}`}
                aria-expanded={detailsOpen}
                aria-controls={detailsId}
                title={detailsOpen ? 'Hide details' : 'Show details'}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  setDetailsOpen(!detailsOpen);
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-primary/10 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-200 ${detailsOpen ? 'rotate-180' : 'rotate-0'}`}
                />
              </button>
            )}
          </div>
        </div>
        <h3 className="mt-auto break-words font-heading text-xl font-bold leading-tight text-text [overflow-wrap:anywhere]">
          {form.title}
        </h3>
        {isOpen && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              className="flex-1 inline-flex min-h-[44px] items-center justify-center font-semibold shadow-xs"
              size="md"
            >
              <Link to={submitPath}>Fill out</Link>
            </Button>
            <Button
              aria-label={`Share ${form.title}`}
              title="Share form"
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
      {form.description && (
        <div
          id={detailsId}
          hidden={!detailsOpen}
          className="space-y-4 border-t border-border p-5 cursor-default"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          <MarkdownRenderer
            content={form.description}
            className="text-sm prose-p:text-muted prose-p:leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
