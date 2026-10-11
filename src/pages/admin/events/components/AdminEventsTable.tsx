import { useState } from 'react';

import {
  BarChart3,
  ClipboardList,
  Copy,
  Edit,
  FormInput,
  MoreHorizontal,
  QrCode,
  Share2,
  UserCheck,
  Users,
} from 'lucide-react';

import { DropdownMenu, DropdownMenuItem } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
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

type AdminEventTableActionsProps = {
  event: AdminEvent;
  canWrite: boolean;
  canRead: boolean;
  canAccessCheckIn: boolean;
  onDuplicateClick?: (event: AdminEvent) => void;
  onShareClick?: (event: AdminEvent) => void;
};

function AdminEventTableActions({
  event,
  canWrite,
  canRead,
  canAccessCheckIn,
  onDuplicateClick,
  onShareClick,
}: AdminEventTableActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      {canWrite && (
        <ActionLink
          to={toRoute('adminEventDetail', { id: event.id })}
          title="Edit"
          aria-label={`Edit ${event.title}`}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Edit className="h-4 w-4" />
          Edit
        </ActionLink>
      )}
      {canRead && (
        <ActionLink
          to={toRoute('adminAttendanceData', { id: event.id })}
          title="Attendees"
          aria-label={`Attendees for ${event.title}`}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Users className="h-4 w-4" />
          Attendees
        </ActionLink>
      )}
      <DropdownMenu
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        usePortal
        trigger={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((isOpen) => !isOpen);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={`More actions for ${event.title}`}
            title="More actions"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        }
      >
        {canWrite && onDuplicateClick && (
          <DropdownMenuItem
            onClick={() => {
              onDuplicateClick(event);
              setIsMenuOpen(false);
            }}
          >
            <span className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Duplicate
            </span>
          </DropdownMenuItem>
        )}
        {canRead && onShareClick && (
          <DropdownMenuItem
            onClick={() => {
              onShareClick(event);
              setIsMenuOpen(false);
            }}
          >
            <span className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share schedule
            </span>
          </DropdownMenuItem>
        )}
        {canWrite && (
          <DropdownMenuItem
            to={toRoute('adminEventAttendance', { id: event.id })}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Attendance settings
            </span>
          </DropdownMenuItem>
        )}
        {canWrite && (
          <DropdownMenuItem
            to={toRoute('adminEventFields', { id: event.id })}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center gap-2">
              <FormInput className="h-4 w-4" />
              Registration fields
            </span>
          </DropdownMenuItem>
        )}
        {canRead && (
          <DropdownMenuItem
            to={toRoute('adminRegistrations', { id: event.id })}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Registrations
            </span>
          </DropdownMenuItem>
        )}
        {canRead && (
          <DropdownMenuItem
            to={toRoute('adminAttendanceDashboard', { id: event.id })}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Attendance dashboard
            </span>
          </DropdownMenuItem>
        )}
        {canAccessCheckIn && (
          <DropdownMenuItem
            to={toRoute('adminAttendanceCheckIn', { id: event.id })}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Check-in
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenu>
    </div>
  );
}

type AdminEventsTableProps = {
  events: AdminEvent[];
  canWrite: boolean;
  canRead: boolean;
  canAccessCheckIn: boolean;
  onEventSelect: (eventId: string) => void;
  onDuplicateClick?: (event: AdminEvent) => void;
  onShareClick?: (event: AdminEvent) => void;
};

export function AdminEventsTable({
  events,
  canWrite,
  canRead,
  canAccessCheckIn,
  onEventSelect,
  onDuplicateClick,
  onShareClick,
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
                <AdminEventTableActions
                  event={event}
                  canWrite={canWrite}
                  canRead={canRead}
                  canAccessCheckIn={canAccessCheckIn}
                  onDuplicateClick={onDuplicateClick}
                  onShareClick={onShareClick}
                />
              </ListTableCell>
            </ListTableRow>
          ))}
        </ListTableBody>
      </ListTable>
    </div>
  );
}
