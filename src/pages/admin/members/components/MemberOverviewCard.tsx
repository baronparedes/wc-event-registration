import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import type { AdminMember } from '@/lib/domain/members';
import { formatDateOnly, formatDateTime } from '@/lib/infrastructure';

export type MemberOverviewCardProps = {
  member: AdminMember;
  title?: string;
  className?: string;
  hideLastActivityBadge?: boolean;
};

export function MemberOverviewCard({
  member,
  title,
  className,
  hideLastActivityBadge,
}: MemberOverviewCardProps) {
  const trimmedName = `${member.nickname ?? ''} ${member.last_name ?? ''}`.trim();
  const avatarName = trimmedName !== '' ? trimmedName : member.full_name;

  return (
    <SectionCard
      title={title}
      wrapperClassName={className}
      headerAction={
        !hideLastActivityBadge &&
        member.last_activity && <Badge>Last Activity: {formatDateTime(member.last_activity)}</Badge>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar
          name={avatarName}
          avatarObjectKey={member.avatar_object_key}
          size="xl"
          className="shrink-0 self-center sm:self-start"
        />
        <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-muted">Full Name</dt>
            <dd className="break-words font-medium text-text">{member.full_name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">Member ID</dt>
            <dd className="break-words font-medium text-text">{member.member_id}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">Role</dt>
            <dd className="break-words font-medium text-text">{member.role}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">Category</dt>
            <dd className="break-words font-medium text-text">{member.category}</dd>
          </div>
          {member.email && (
            <div className="min-w-0">
              <dt className="text-muted">Email</dt>
              <dd className="break-all font-medium text-text">{member.email}</dd>
            </div>
          )}
          {member.date_of_birth && (
            <div className="min-w-0">
              <dt className="text-muted">Date of Birth</dt>
              <dd className="break-words font-medium text-text">
                {formatDateOnly(member.date_of_birth)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </SectionCard>
  );
}
