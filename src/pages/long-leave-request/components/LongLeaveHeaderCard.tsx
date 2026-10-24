import { Badge } from '@/components/ui/Badge';
import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';

type LongLeaveHeaderCardProps = {
  defaultExpanded?: boolean;
};

export function LongLeaveHeaderCard({ defaultExpanded = true }: LongLeaveHeaderCardProps) {
  const titleContent = (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="min-w-0 flex-1 break-words font-heading text-lg font-semibold text-text sm:text-xl">
        Volunteer Long Leave Request
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
      collapseLabel="Collapse long leave details"
      expandLabel="Expand long leave details"
      title={titleContent}
    >
      <div className="pt-4">
        <p className="text-balance leading-relaxed">
          Submit an advance absence notification for Sunday service attendance. If you will not be
          able to serve on an upcoming Sunday, please let your coordinators and team leaders know
          here so they can update the service schedule.
        </p>
      </div>
    </CollapsibleSectionCard>
  );
}
