import { Edit, User } from 'lucide-react';

import { Badge } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { Avatar } from '@/components/ui/Avatar';
import { toRoute } from '@/config/constants';
import type { AdminMember } from '@/lib/domain/members';

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
    <article className="relative rounded-2xl border border-border/40 bg-surface shadow-sm">
      <div className="space-y-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={avatarName}
              avatarObjectKey={member.avatar_object_key}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-bold leading-snug text-[#0f172a]">
                {member.full_name}
              </h2>
              {member.nickname && (
                <p className="truncate text-[15px] text-slate-500">({member.nickname})</p>
              )}
            </div>
          </div>
          <Badge
            variant={member.is_active ? 'default' : 'destructive'}
            className={`px-3 py-1 font-semibold rounded-full ${member.is_active ? 'bg-primary text-white' : ''}`}
          >
            {member.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 pb-2">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            Role: {member.role}
          </span>
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            Group: {member.category}
          </span>
        </div>

        <div className="border-t border-slate-100"></div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 py-1">
          <div className="col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</dt>
            <dd className="mt-1 break-all text-[15px] font-medium text-slate-700">
              {member.email ? (
                member.email
              ) : (
                <span className="italic text-slate-400 font-normal">Not provided</span>
              )}
            </dd>
          </div>
          <div className="pr-0 sm:pr-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contact Number
            </dt>
            <dd className="mt-1 truncate text-[15px] font-medium text-slate-700">
              {member.phone ? (
                member.phone
              ) : (
                <span className="italic text-slate-400 font-normal">Not provided</span>
              )}
            </dd>
          </div>
          <div className="pr-0 sm:pr-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Member ID
            </dt>
            <dd className="mt-1 truncate font-mono text-[15px] font-semibold text-[#0f172a]">
              {member.member_id}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex gap-3 p-4 pt-0">
        <ActionLink
          to={toRoute('adminMemberDetail', { id: member.id })}
          title={actionLabel}
          aria-label={actionLabel}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-white no-underline shadow-sm transition-colors hover:bg-primary/90"
        >
          {canEdit ? <Edit className="h-4 w-4" /> : <User className="h-4 w-4" />}
          {actionLabel} Profile
        </ActionLink>
        {canEdit && (
          <UpdateMemberIdDialog
            memberId={member.id}
            memberName={member.full_name}
            currentMemberId={member.member_id}
            triggerClassName="flex min-h-12 w-[100px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
          />
        )}
      </div>
    </article>
  );
}
