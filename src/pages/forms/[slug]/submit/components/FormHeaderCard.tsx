import DOMPurify from 'dompurify';
import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AdminForm } from '@/lib/domain/forms';

type FormHeaderCardProps = {
  form: AdminForm | null | undefined;
  isLoading: boolean;
  isError: boolean;
  defaultExpanded?: boolean;
};

export function FormHeaderCard({
  form,
  isLoading,
  isError,
  defaultExpanded = true,
}: FormHeaderCardProps) {
  const title = form?.title ?? 'Form Submission';
  const isOpen = form?.status === 'published';

  const audienceLabel =
    form?.audience === 'members'
      ? 'Members Only'
      : form?.audience === 'members_and_public'
        ? 'Open to Guests'
        : 'Public';

  const titleContent = form ? (
    <div className="flex min-w-0 flex-col items-stretch gap-2 pr-10 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 truncate font-semibold text-text">{title}</span>
      <div className="flex min-w-0 max-w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
        {form.audience === 'members_and_public' && (
          <Badge icon={<Users className="h-3.5 w-3.5" />} variant="outline">
            {audienceLabel}
          </Badge>
        )}
        {form.audience !== 'members_and_public' && <Badge variant="outline">{audienceLabel}</Badge>}
        <Badge variant={isOpen ? 'success' : 'neutral'}>{isOpen ? 'Open' : 'Closed'}</Badge>
      </div>
    </div>
  ) : (
    title
  );

  return (
    <CollapsibleSectionCard
      defaultExpanded={defaultExpanded}
      collapseLabel="Collapse form details"
      expandLabel="Expand form details"
      title={titleContent}
      subtitle={
        !form && (
          <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Form Submission
          </span>
        )
      }
      wrapperClassName="rounded-2xl border border-border bg-surface p-4 shadow-sm"
    >
      {isLoading && (
        <div className="mt-4 space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      )}

      {isError && <p className="mt-2 text-sm text-destructive">Failed to load form details.</p>}

      {form?.description && (
        <div
          className="
            mt-3 text-sm text-muted leading-relaxed
            [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-text [&_h1]:mb-3
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-text [&_h2]:mb-2
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-text [&_h3]:mb-2
            [&_p]:mb-3
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
            [&_a]:text-primary [&_a]:underline
            [&_table]:w-full [&_table]:border-collapse [&_table]:mt-2 [&_table]:mb-3
            [&_th]:border [&_th]:border-border [&_th]:bg-accent/20 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-text
            [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
          "
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(form.description),
          }}
        />
      )}
    </CollapsibleSectionCard>
  );
}
