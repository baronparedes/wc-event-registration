import { format, parseISO } from 'date-fns';

import {
  Avatar,
  Badge,
  ContactButtons,
  MobileCard,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';

import type { MissedCommitmentsViewProps } from './types';

export function MissedCommitmentsMobileList({
  volunteers,
  filterMode,
}: MissedCommitmentsViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {volunteers.map((volunteer) => {
        const key = volunteer.user_id || volunteer.member_id || volunteer.full_name;
        const trimmedName = `${volunteer.nickname ?? ''}`.trim();
        const avatarName = trimmedName !== '' ? trimmedName : volunteer.full_name;
        const roleSubtitle = volunteer.roles.length > 0 ? volunteer.roles.join(', ') : 'Volunteer';

        return (
          <MobileCard key={key}>
            <MobileCardBody>
              {/* Header: Avatar, Name, Nickname, Roles & Category, Top-Right Badge */}
              <MobileCardHeader>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    name={avatarName}
                    avatarObjectKey={volunteer.avatar_object_key}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-semibold leading-snug text-text">
                      {volunteer.full_name}
                    </h2>
                    {volunteer.nickname && (
                      <p className="truncate text-sm text-muted">({volunteer.nickname})</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1 pb-1 text-xs text-muted">
                      <p>
                        {roleSubtitle}
                        {volunteer.category ? ` • ${volunteer.category}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {volunteer.roles.length > 0 ? (
                    volunteer.roles.map((role) => (
                      <Badge key={role} variant="default" className="text-xs">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="default" className="text-xs">
                      Volunteer
                    </Badge>
                  )}
                </div>
              </MobileCardHeader>

              <MobileCardDivider />

              {/* Content Grid matching /admin/members MobileMemberCard */}
              <MobileCardContent>
                <MobileCardContentItem
                  label="Member ID"
                  value={volunteer.member_id}
                  isMono
                  colSpan={2}
                />

                <MobileCardContentItem label="Contact Number" colSpan={2}>
                  {volunteer.phone ? (
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[15px] font-medium text-text">{volunteer.phone}</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ContactButtons
                          phone={volunteer.phone}
                          size="sm"
                          variant="icon"
                          showCopyFallback={false}
                        />
                      </div>
                    </div>
                  ) : undefined}
                </MobileCardContentItem>

                <MobileCardContentItem label="Missed Commitments" colSpan={2}>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {volunteer.commitments.length > 1 && (
                      <span className="rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-surface-hover dark:text-text border border-border/40">
                        {volunteer.commitments.length}×
                      </span>
                    )}
                    {volunteer.commitments.map((commitment, idx) => {
                      const isExcused = commitment.status === 'excused';
                      const datePrefix =
                        filterMode !== 'sunday'
                          ? `${format(parseISO(commitment.service_date), 'MMM d')} • `
                          : '';
                      return (
                        <Badge
                          key={`${commitment.service_date}-${commitment.time_slot}-${idx}`}
                          variant={isExcused ? 'accent' : 'destructive'}
                          className="text-xs font-medium py-0.5 px-2"
                          title={isExcused ? 'Excused' : 'Absent'}
                        >
                          {datePrefix}
                          {commitment.time_slot}
                        </Badge>
                      );
                    })}
                  </div>
                </MobileCardContentItem>
              </MobileCardContent>
            </MobileCardBody>
          </MobileCard>
        );
      })}
    </div>
  );
}
