import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
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
        <Badge variant={isOpen ? 'default' : 'outline'}>{isOpen ? 'Open' : 'Closed'}</Badge>
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
        <div className="mt-3">
          <MarkdownRenderer content={form.description} />
        </div>
      )}
    </CollapsibleSectionCard>
  );
}
