import { FileText, Share } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button, MarkdownRenderer } from '@/components/ui';
import { toRoute } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';

type FormCardProps = {
  form: Pick<AdminForm, 'title' | 'slug' | 'description' | 'status'>;
  submissionPath?: string;
  statusLabel?: string;
};

/**
 * Displays a single form card with title, status, and description.
 * Used in the hub page to show available forms.
 */
export function FormCard({ form, submissionPath, statusLabel = 'Open' }: FormCardProps) {
  const submitPath = submissionPath ?? toRoute('formSubmit', { slug: form.slug });
  const shareUrl = new URL(submitPath, window.location.origin).toString();
  const isOpen = form.status === 'published';

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
    <article
      className="group relative isolate flex self-start flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md [container-type:inline-size]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -bottom-6 -z-10 text-primary opacity-[0.04] dark:opacity-[0.06] select-none"
      >
        <FileText className="h-44 w-44 stroke-[0.75] -rotate-12 transform" />
      </div>

      <div className="relative z-10 flex flex-col gap-4 p-5 sm:min-h-[340px]">
        <div className="flex items-start justify-between gap-3">
          <FileText className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={isOpen ? 'default' : 'secondary'}>{statusLabel}</Badge>
          </div>
        </div>
        <h3 className="break-words font-heading text-xl font-bold leading-tight text-text [overflow-wrap:anywhere]">
          {isOpen ? (
            <Link
              to={submitPath}
              className="focus:outline-none before:absolute before:inset-0 before:z-0 rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {form.title}
            </Link>
          ) : (
            form.title
          )}
        </h3>
        {form.description && (
          <div className="relative z-20">
            <MarkdownRenderer
              content={form.description}
              className="text-sm prose-p:text-muted prose-p:leading-relaxed"
            />
          </div>
        )}
        {isOpen && (
          <div className="relative z-20 mt-auto flex items-center gap-2">
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
    </article>
  );
}
