import { Badge } from '@/components/ui/Badge';
import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

type ExcuseHeaderCardProps = {
  defaultExpanded?: boolean;
};

export function ExcuseHeaderCard({ defaultExpanded = true }: ExcuseHeaderCardProps) {
  const titleContent = (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="min-w-0 flex-1 break-words font-heading text-lg font-semibold text-text sm:text-xl">
        Volunteer Excuse Request
      </span>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <Badge variant="outline">Volunteers Only</Badge>
        <Badge variant="default">Open</Badge>
      </div>
    </div>
  );

  return (
    <CollapsibleSectionCard
      defaultExpanded={defaultExpanded}
      collapseLabel="Collapse excuse details"
      expandLabel="Expand excuse details"
      title={titleContent}
      subtitle={
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Sunday Service Attendance
        </span>
      }
    >
      <div className="space-y-4 pt-2">
        <MarkdownRenderer
          content={`Submit an advance absence notification for Sunday service attendance.\n\nIf you will not be able to serve on an upcoming Sunday, please let your coordinators and team leaders know here so they can update the service schedule.`}
        />
      </div>
    </CollapsibleSectionCard>
  );
}
