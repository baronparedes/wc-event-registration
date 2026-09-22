import { ClipboardList, Copy, FormInput, QrCode, Settings, UserCheck, Users } from 'lucide-react';

import { ActionButton, ActionLink } from '@/components/ui/ActionLink';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { toRoute } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';
import { formatDateOnly } from '@/lib/infrastructure';

import { DuplicatePolicyLabel } from './DuplicatePolicyLabel';
import { EventStatusBadge } from './EventStatusBadge';

type AdminEventsTableProps = {
  events: AdminEvent[];
  canWrite: boolean;
  canRead: boolean;
  canAccessCheckIn: boolean;
  onEventSelect: (eventId: string) => void;
  onDuplicateClick?: (event: AdminEvent) => void;
};

export function AdminEventsTable({
  events,
  canWrite,
  canRead,
  canAccessCheckIn,
  onEventSelect,
  onDuplicateClick,
}: AdminEventsTableProps) {
  return (
    <div>
      <ListTable>
        <ListTableHead>
          <ListTableHeaderRow>
            <ListTableHeaderCell className="px-6">Event</ListTableHeaderCell>
            <ListTableHeaderCell>Location</ListTableHeaderCell>
            <ListTableHeaderCell>Status</ListTableHeaderCell>
            <ListTableHeaderCell>Duplicate Policy</ListTableHeaderCell>
            <ListTableHeaderCell>Reg. Mode</ListTableHeaderCell>
            <ListTableHeaderCell>Starts</ListTableHeaderCell>
            <ListTableHeaderCell>Registrations</ListTableHeaderCell>
            <ListTableHeaderCell>Actions</ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>
        <ListTableBody>
          {events.map((event) => (
            <ListTableRow
              key={event.id}
              className={canWrite ? 'cursor-pointer' : undefined}
              onClick={canWrite ? () => onEventSelect(event.id) : undefined}
            >
              <ListTableCell className="px-6">
                <p className="font-medium text-text">{event.title}</p>
                <p className="mt-0.5 text-xs text-muted">{event.slug}</p>
              </ListTableCell>
              <ListTableCell>
                <span className="text-sm text-text">{event.location}</span>
              </ListTableCell>
              <ListTableCell>
                <EventStatusBadge status={event.status} />
              </ListTableCell>
              <ListTableCell>
                <DuplicatePolicyLabel policy={event.duplicate_policy} />
              </ListTableCell>
              <ListTableCell>
                <span className="text-sm capitalize text-text">{event.registration_mode}</span>
              </ListTableCell>
              <ListTableCell>
                <span className="text-sm text-text">{formatDateOnly(event.starts_at)}</span>
              </ListTableCell>
              <ListTableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted">
                    Members:{' '}
                    <span className="font-medium text-text text-sm">
                      {event.member_registration_count ?? 0}
                    </span>
                  </span>
                  <span className="text-xs text-muted">
                    Public:{' '}
                    <span className="font-medium text-text text-sm">
                      {event.public_registration_count ?? 0}
                    </span>
                  </span>
                </div>
              </ListTableCell>
              <ListTableCell onClick={(eventClick) => eventClick.stopPropagation()}>
                <div className="flex items-center gap-3">
                  {canWrite && (
                    <ActionLink
                      to={toRoute('adminEventDetail', { id: event.id })}
                      title="Edit"
                      aria-label="Edit"
                    >
                      <Settings className="h-5 w-5" />
                    </ActionLink>
                  )}
                  {canWrite && onDuplicateClick && (
                    <ActionButton
                      title="Duplicate"
                      aria-label="Duplicate"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateClick(event);
                      }}
                    >
                      <Copy className="h-5 w-5" />
                    </ActionButton>
                  )}
                  {canWrite && (
                    <ActionLink
                      to={toRoute('adminEventAttendance', { id: event.id })}
                      title="Attendance"
                      aria-label="Attendance"
                    >
                      <UserCheck className="h-5 w-5" />
                    </ActionLink>
                  )}
                  {canWrite && (
                    <ActionLink
                      to={toRoute('adminEventFields', { id: event.id })}
                      title="Fields"
                      aria-label="Fields"
                    >
                      <FormInput className="h-5 w-5" aria-label="Fields" />
                    </ActionLink>
                  )}
                  {canRead && (
                    <ActionLink
                      to={toRoute('adminAttendanceData', { id: event.id })}
                      title="Attendee Details"
                      aria-label="Attendee Details"
                    >
                      <Users className="h-5 w-5" />
                    </ActionLink>
                  )}
                  {canRead && (
                    <ActionLink
                      to={toRoute('adminRegistrations', { id: event.id })}
                      title="Registrations"
                      aria-label="Registrations"
                    >
                      <ClipboardList className="h-5 w-5" />
                    </ActionLink>
                  )}
                  {canAccessCheckIn && (
                    <ActionLink
                      to={toRoute('adminAttendanceCheckIn', { id: event.id })}
                      title="Check-In"
                      aria-label="Check-In"
                    >
                      <QrCode className="h-5 w-5" />
                    </ActionLink>
                  )}
                </div>
              </ListTableCell>
            </ListTableRow>
          ))}
        </ListTableBody>
      </ListTable>
    </div>
  );
}
