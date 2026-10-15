import { format, parseISO } from 'date-fns';

import { Avatar, Badge, ContactButtons } from '@/components/ui';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';

import type { MissedCommitmentsViewProps } from './types';

export function MissedCommitmentsTable({ volunteers, filterMode }: MissedCommitmentsViewProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">
      <ListTable>
        <ListTableHead>
          <ListTableHeaderRow>
            <ListTableHeaderCell>Volunteer</ListTableHeaderCell>
            <ListTableHeaderCell>Role</ListTableHeaderCell>
            <ListTableHeaderCell>Missed Commitments</ListTableHeaderCell>
            <ListTableHeaderCell>Contact Number</ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>
        <ListTableBody>
          {volunteers.map((volunteer) => {
            const key = volunteer.user_id || volunteer.member_id || volunteer.full_name;
            return (
              <ListTableRow key={key}>
                {/* Volunteer Name & Avatar */}
                <ListTableCell>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={volunteer.full_name}
                      avatarObjectKey={volunteer.avatar_object_key}
                      size="sm"
                      className="h-8 w-8 shrink-0 text-xs"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-text text-sm">
                          {volunteer.full_name}
                        </span>
                        {volunteer.nickname && (
                          <span className="text-xs text-muted shrink-0">
                            ({volunteer.nickname})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted">
                        {volunteer.member_id}
                        {volunteer.category ? ` • ${volunteer.category}` : ''}
                      </span>
                    </div>
                  </div>
                </ListTableCell>

                {/* Role */}
                <ListTableCell>
                  <div className="flex flex-wrap gap-1">
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
                </ListTableCell>

                {/* Missed Commitments (Grouped Slots/Dates) */}
                <ListTableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
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
                </ListTableCell>

                {/* Contact Number */}
                <ListTableCell onClick={(e) => e.stopPropagation()}>
                  {volunteer.phone ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text">{volunteer.phone}</span>
                      <ContactButtons
                        phone={volunteer.phone}
                        size="sm"
                        variant="icon"
                        showCopyFallback={false}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </ListTableCell>
              </ListTableRow>
            );
          })}
        </ListTableBody>
      </ListTable>
    </div>
  );
}
