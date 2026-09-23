import { Edit2, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react';

import { Avatar, Badge } from '@/components/ui';
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
    <article className="relative rounded-xl border border-border/60 bg-background shadow-sm">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
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
        </div>

        <dl className="text-center grid grid-cols-2 pt-2.5 border-t border-border mt-3">
          <div className="pr-0 sm:pr-2">
            <dt className="text-xs text-muted mb-1.5">Assigned Role</dt>
            <dd>
              <Badge variant={getRoleBadgeVariant(assignment.role)}>
                <span className="uppercase tracking-wider font-semibold">{assignment.role}</span>
              </Badge>
            </dd>
          </div>
          <div className="pr-0 sm:pr-2">
            <dt className="text-xs text-muted mb-1.5">Assigned Date</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-text">{formattedDate}</dd>
          </div>
        </dl>
      </div>

      {isSuperAdmin ? (
        <div className="flex min-h-11 items-center justify-center gap-2 rounded-b-xl border-t border-border bg-surface text-sm font-medium text-muted">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Protected Role
        </div>
      ) : (
        <div className="flex divide-x divide-border border-t border-border bg-surface rounded-b-xl">
          <button
            type="button"
            onClick={() => onEdit(assignment)}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-bl-xl text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onRevoke(assignment)}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-br-xl text-sm font-medium text-danger transition-colors hover:bg-danger/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-danger/30"
          >
            <Trash2 className="h-4 w-4" />
            Revoke
          </button>
        </div>
      )}
    </article>
  );
}
