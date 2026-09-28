import { Edit2, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react';

import {
  Avatar,
  Badge,
  MobileCard,
  MobileCardActionButton,
  MobileCardActionPill,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';
import type { AdminRole, AdminRoleAssignment } from '@/hooks/domain/auth';

function getRoleBadgeVariant(role: AdminRole): 'secondary' | 'default' | 'outline' {
  switch (role) {
    case 'super_admin':
      return 'secondary';
    case 'admin':
      return 'default';
    case 'slod':
      return 'outline';
    case 'imt':
      return 'default';
    case 'kiosk':
      return 'outline';
    default:
      return 'outline';
  }
}

type MobileRoleCardProps = {
  assignment: AdminRoleAssignment;
  onEdit: (assignment: AdminRoleAssignment) => void;
  onRevoke: (assignment: AdminRoleAssignment) => void;
};

export function MobileRoleCard({ assignment, onEdit, onRevoke }: MobileRoleCardProps) {
  const isSuperAdmin = assignment.role === 'super_admin';
  const formattedDate = new Date(assignment.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <MobileCard>
      <MobileCardBody>
        <MobileCardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={assignment.name}
              avatarObjectKey={assignment.avatar_object_key}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold leading-snug text-text">
                {assignment.name}
              </h2>
              <div className="flex items-center gap-1.5 pt-1">
                <p className="break-all text-sm font-medium text-text">{assignment.email}</p>
                {assignment.has_member_profile && (
                  <span title="Verified Member Profile">
                    <ShieldCheck
                      className="h-4 w-4 text-primary shrink-0"
                      aria-label="Verified Member Profile"
                    />
                  </span>
                )}
              </div>
              <small className="truncate text-[0.65rem] text-muted font-mono pt-1">
                {assignment.auth_user_id}
              </small>
            </div>
          </div>
        </MobileCardHeader>

        <MobileCardDivider />

        <MobileCardContent className="text-center">
          <MobileCardContentItem label="Assigned Role">
            <Badge variant={getRoleBadgeVariant(assignment.role)}>
              <span className="uppercase tracking-wider font-semibold">{assignment.role}</span>
            </Badge>
          </MobileCardContentItem>
          <MobileCardContentItem label="Assigned Date" value={formattedDate} />
        </MobileCardContent>
      </MobileCardBody>

      <MobileCardActions>
        {isSuperAdmin ? (
          <MobileCardActionPill>
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            Protected Role
          </MobileCardActionPill>
        ) : (
          <>
            <MobileCardActionButton onClick={() => onEdit(assignment)}>
              <Edit2 className="h-4 w-4" />
              Edit
            </MobileCardActionButton>
            <MobileCardActionButton variant="accent" onClick={() => onRevoke(assignment)}>
              <Trash2 className="h-4 w-4" />
              Revoke
            </MobileCardActionButton>
          </>
        )}
      </MobileCardActions>
    </MobileCard>
  );
}
