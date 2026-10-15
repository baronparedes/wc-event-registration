import { format, parseISO } from 'date-fns';

import { Avatar, Badge, ContactButtons, MobileCard, MobileCardBody } from '@/components/ui';

import type { MissedCommitmentsViewProps } from './types';

export function MissedCommitmentsMobileList({
  volunteers,
  filterMode,
}: MissedCommitmentsViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {volunteers.map((volunteer) => {
        const key = volunteer.user_id || volunteer.member_id || volunteer.full_name;
        return (
          <MobileCard key={key} className="overflow-hidden">
            <MobileCardBody className="space-y-3 p-3.5">
              {/* Header: Avatar, Name, Member ID, Role Badges */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    name={volunteer.full_name}
                    avatarObjectKey={volunteer.avatar_object_key}
                    size="md"
                    className="shrink-0 text-xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-text text-sm">
                        {volunteer.full_name}
                      </span>
                      {volunteer.nickname && (
                        <span className="text-xs text-muted shrink-0">({volunteer.nickname})</span>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      {volunteer.member_id}
                      {volunteer.category ? ` • ${volunteer.category}` : ''}
                    </span>
                  </div>
                </div>

                {/* Role Badges */}
                <div className="flex flex-wrap justify-end gap-1 shrink-0">
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
              </div>

              {/* Contact Number and Action */}
              {volunteer.phone && (
                <div className="flex items-center justify-between rounded-lg bg-surface-hover/60 px-3 py-2 text-xs border border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Contact:</span>
                    <span className="font-medium text-text">{volunteer.phone}</span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ContactButtons
                      phone={volunteer.phone}
                      size="sm"
                      variant="icon"
                      showCopyFallback={false}
                    />
                  </div>
                </div>
              )}

              {/* Missed Commitments Chips */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted">Missed Commitments:</span>
                  {volunteer.commitments.length > 1 && (
                    <span className="rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-surface-hover dark:text-text border border-border/40">
                      {volunteer.commitments.length}×
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
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
              </div>
            </MobileCardBody>
          </MobileCard>
        );
      })}
    </div>
  );
}
