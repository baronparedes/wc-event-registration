import {
  Avatar,
  Badge,
  Button,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui';
import {
  RECRUITMENT_STEPS,
  type RecruitmentApplication,
  type RecruitmentApplicationStatus,
} from '@/lib/domain/recruitment';

interface RecruitmentTableProps {
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
    case 'declined':
    case 'withdrawn':
      return 'destructive';
    case 'on_hold':
      return 'secondary';
  }
}

export function RecruitmentTable({ applications, onSelectApplication }: RecruitmentTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <ListTable>
        <ListTableHead>
          <ListTableHeaderRow>
            <ListTableHeaderCell>Applicant</ListTableHeaderCell>
            <ListTableHeaderCell>Role</ListTableHeaderCell>
            <ListTableHeaderCell>Current Step</ListTableHeaderCell>
            <ListTableHeaderCell>Endorsement</ListTableHeaderCell>
            <ListTableHeaderCell>Survey Score</ListTableHeaderCell>
            <ListTableHeaderCell>Status</ListTableHeaderCell>
            <ListTableHeaderCell className="text-right">Action</ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>

        <ListTableBody divider="default">
          {applications.map((app) => {
            const stepMeta = RECRUITMENT_STEPS.find((s) => s.stepNumber === app.current_step);
            const role = app.confirmed_role ?? app.desired_role;

            return (
              <ListTableRow key={app.id}>
                <ListTableCell>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={app.full_name}
                      avatarObjectKey={app.avatar_object_key}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {app.full_name} {app.nickname ? `(${app.nickname})` : ''}
                      </p>
                      <p className="truncate text-xs text-muted">{app.email}</p>
                      <p className="truncate text-xs text-muted">{app.phone}</p>
                    </div>
                  </div>
                </ListTableCell>

                <ListTableCell>
                  <Badge variant="outline">{role}</Badge>
                </ListTableCell>

                <ListTableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text">
                    <Badge variant="secondary">Step {app.current_step}</Badge>
                    <span className="hidden lg:inline">{stepMeta?.shortLabel}</span>
                  </span>
                </ListTableCell>

                <ListTableCell>
                  {app.dgroup_approval_id ? (
                    <Badge variant="default">Linked</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </ListTableCell>

                <ListTableCell>
                  <span className="font-mono text-xs font-semibold text-text">
                    {app.survey_score} / {app.survey_total}
                  </span>
                </ListTableCell>

                <ListTableCell>
                  <Badge variant={getStatusBadgeVariant(app.status)} className="capitalize">
                    {app.status.replace('_', ' ')}
                  </Badge>
                </ListTableCell>

                <ListTableCell className="text-right">
                  <Button
                    size="sm"
                    variant="primaryOutline"
                    onClick={() => onSelectApplication(app)}
                  >
                    Review
                  </Button>
                </ListTableCell>
              </ListTableRow>
            );
          })}
        </ListTableBody>
      </ListTable>
    </div>
  );
}
