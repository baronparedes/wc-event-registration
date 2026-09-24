import { Badge, MobileCardHeader } from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import type { AdminMember } from '@/lib/domain/members';
import { formatDateTime } from '@/lib/infrastructure';

export type MobileMemberHeaderProps = {
  member: AdminMember;
  className?: string;
};

export function MobileMemberHeader({ member, className }: MobileMemberHeaderProps) {
  const trimmedName = `${member.nickname ?? ''} ${member.last_name ?? ''}`.trim();
  const avatarName = trimmedName !== '' ? trimmedName : member.full_name;

  return (
    <MobileCardHeader className={className}>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          name={avatarName}
          avatarObjectKey={member.avatar_object_key}
          size="md"
          className="shrink-0"
        />
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold leading-snug text-[#0f172a]">
            {member.full_name}
          </h2>
          {member.nickname && (
            <p className="truncate text-sm text-slate-500">({member.nickname})</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1 pb-2 text-xs text-muted">
            <p>
              {member.role} • {member.category}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge
          variant={member.is_active ? 'default' : 'destructive'}
          className={`px-3 py-1 rounded-full ${member.is_active ? 'bg-primary text-white' : ''}`}
        >
          {member.is_active ? 'Active' : 'Inactive'}
        </Badge>
        {member.last_activity && (
          <Badge>Last Activity: {formatDateTime(member.last_activity)}</Badge>
        )}
      </div>
    </MobileCardHeader>
  );
}
