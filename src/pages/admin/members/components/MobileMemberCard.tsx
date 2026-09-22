import { Edit, User } from 'lucide-react';

import { ActionLink } from '@/components/ui/ActionLink';
import { Avatar } from '@/components/ui/Avatar';
import { toRoute } from '@/config/constants';
import type { AdminMember } from '@/lib/domain/members';

import { MemberStatusBadge } from './MemberStatusBadge';
import { UpdateMemberIdDialog } from './UpdateMemberIdDialog';

type MobileMemberCardProps = {
  member: AdminMember;
  canWrite: boolean;
};

export function MobileMemberCard({ member, canWrite }: MobileMemberCardProps) {
  const canEdit = canWrite && member.is_active;
  let actionLabel = 'View';

  if (canEdit) {
    actionLabel = 'Edit';
  }

  const trimmedName = `${member.nickname ?? ''} ${member.last_name ?? ''}`.trim();
  const avatarName = trimmedName !== '' ? trimmedName : member.full_name;

  return (
    <article className="relative rounded-xl border border-border/60 bg-background shadow-sm">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={avatarName}
              avatarObjectKey={member.avatar_object_key}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold leading-snug text-text">
                {member.full_name}
              </h2>
              {member.nickname && (
                <p className="truncate text-xs text-muted">({member.nickname})</p>
              )}
            </div>
          </div>
          <MemberStatusBadge isActive={member.is_active} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-2.5">
          <div className="col-span-2">
            <dt className="text-xs text-muted">Email</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-text">{member.email || '—'}</dd>
          </div>
          <div className="pr-0 sm:pr-2">
            <dt className="text-xs text-muted">Member ID</dt>
            <dd className="mt-0.5 truncate font-mono text-sm font-medium text-text">
              {member.member_id}
            </dd>
          </div>
          <div className="px-0 sm:px-2">
            <dt className="text-xs text-muted">Role</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-text">{member.role || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="flex divide-x divide-border rounded-b-xl border-t border-border bg-surface">
        <ActionLink
          to={toRoute('adminMemberDetail', { id: member.id })}
          title={actionLabel}
          aria-label={actionLabel}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 text-sm font-medium no-underline shadow-sm hover:shadow-md ${
            canEdit
              ? 'rounded-bl-xl bg-primary text-white hover:bg-primary/90'
              : 'rounded-b-xl text-primary hover:bg-primary/10'
          }`}
        >
          {canEdit ? <Edit className="h-4 w-4" /> : <User className="h-4 w-4" />}
          {actionLabel}
        </ActionLink>
        {canEdit && (
          <div className="flex flex-1 items-center justify-center">
            <UpdateMemberIdMobileAction
              memberId={member.id}
              memberName={member.full_name}
              currentMemberId={member.member_id}
            />
          </div>
        )}
      </div>
    </article>
  );
}

// We need a custom wrapper for UpdateMemberIdDialog to match the "flex-1" mobile action look.
// UpdateMemberIdDialog currently renders an ActionButton with an IdCardLanyard icon.
// On mobile we want the whole right side to be clickable or at least look like a button.
function UpdateMemberIdMobileAction({
  memberId,
  memberName,
  currentMemberId,
}: {
  memberId: string;
  memberName: string;
  currentMemberId: string;
}) {
  return (
    <div className="flex w-full items-center justify-center py-2.5">
      <UpdateMemberIdDialog
        memberId={memberId}
        memberName={memberName}
        currentMemberId={currentMemberId}
      />
    </div>
  );
}
