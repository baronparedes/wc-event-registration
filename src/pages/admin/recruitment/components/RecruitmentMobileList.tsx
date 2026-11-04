import { Avatar, Badge, Button } from '@/components/ui';
import {
  RECRUITMENT_STEPS,
  type RecruitmentApplication,
  type RecruitmentApplicationStatus,
} from '@/lib/domain/recruitment';

interface RecruitmentMobileListProps {
  applications: RecruitmentApplication[];
  onSelectApplication: (application: RecruitmentApplication) => void;
}

function getStatusBadgeVariant(
  status: RecruitmentApplicationStatus,
): 'default' | 'secondary' | 'accent' | 'destructive' {
  switch (status) {
    case 'active':
      return 'default';
    case 'deployed':
      return 'accent';
    case 'archived':
    case 'on_hold':
      return 'secondary';
    case 'declined':
    case 'withdrawn':
      return 'destructive';
  }
}

export function RecruitmentMobileList({
  applications,
  onSelectApplication,
}: RecruitmentMobileListProps) {
  return (
    <div className="space-y-3">
      {applications.map((app) => {
        const stepMeta = RECRUITMENT_STEPS.find((s) => s.stepNumber === app.current_step);
        const role = app.confirmed_role ?? app.desired_role;

        return (
          <article
            key={app.id}
            className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={app.full_name} avatarObjectKey={app.avatar_object_key} size="md" />
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-text">
                    {app.full_name} {app.nickname ? `(${app.nickname})` : ''}
                  </h4>
                  <p className="truncate text-xs text-muted">{app.email}</p>
                  <p className="truncate text-xs text-muted">{app.phone}</p>
                </div>
              </div>

              <Badge variant={getStatusBadgeVariant(app.status)} className="capitalize shrink-0">
                {app.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <Badge variant="outline">{role}</Badge>
              <Badge variant="secondary">
                Step {app.current_step}: {stepMeta?.shortLabel}
              </Badge>
              <span className="font-mono text-muted">
                Survey: {app.survey_score}/{app.survey_total}
              </span>
            </div>

            <div className="pt-2">
              <Button
                variant="primaryOutline"
                size="sm"
                className="w-full"
                onClick={() => onSelectApplication(app)}
              >
                Review Application
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
