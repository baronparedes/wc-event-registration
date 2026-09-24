import { useState } from 'react';

import {
  ClipboardList,
  Copy,
  Edit,
  FormInput,
  MapPin,
  MoreHorizontal,
  QrCode,
  UserCheck,
  Users,
} from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  MobileCard,
  MobileCardActionLink,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';
import { toRoute } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';
import { formatDateOnly } from '@/lib/infrastructure';

import { DuplicatePolicyLabel } from './DuplicatePolicyLabel';
import { EventStatusBadge } from './EventStatusBadge';

type MobileEventCardProps = {
  event: AdminEvent;
  canWrite: boolean;
  canRead: boolean;
  canAccessCheckIn: boolean;
  onDuplicateClick?: (event: AdminEvent) => void;
};

export function MobileEventCard({
  event,
  canWrite,
  canRead,
  canAccessCheckIn,
  onDuplicateClick,
}: MobileEventCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasActions = canWrite || canRead || canAccessCheckIn;

  return (
    <MobileCard>
      <MobileCardBody>
        <MobileCardHeader>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-text">
              {event.title}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted">{event.slug}</p>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </p>
          </div>
          <EventStatusBadge status={event.status} />
        </MobileCardHeader>

        <MobileCardDivider />

        <MobileCardContent>
          <MobileCardContentItem label="Starts" value={formatDateOnly(event.starts_at)} />
          <MobileCardContentItem
            label="Reg. Mode"
            value={event.registration_mode}
            valueClassName="mt-0.5 truncate text-sm font-medium capitalize text-text"
          />
          <MobileCardContentItem
            label="Reg. Members"
            value={event.member_registration_count}
            valueClassName="mt-0.5 truncate text-sm font-medium capitalize text-text"
          />
          <MobileCardContentItem
            label="Reg. Non-Members"
            value={event.public_registration_count}
            valueClassName="mt-0.5 truncate text-sm font-medium capitalize text-text"
          />
          <MobileCardContentItem label="Duplicate Policy" colSpan={2}>
            <DuplicatePolicyLabel policy={event.duplicate_policy} />
          </MobileCardContentItem>
        </MobileCardContent>
      </MobileCardBody>

      {hasActions && (
        <MobileCardActions>
          {canWrite && (
            <MobileCardActionLink
              to={toRoute('adminEventDetail', { id: event.id })}
              title="Edit event"
              aria-label={`Edit ${event.title}`}
              variant="primaryOutline"
            >
              <Edit className="h-4 w-4" />
              Edit
            </MobileCardActionLink>
          )}
          {canRead && (
            <MobileCardActionLink
              to={toRoute('adminAttendanceData', { id: event.id })}
              title="View attendees"
              aria-label={`View attendees for ${event.title}`}
              variant="default"
            >
              <Users className="h-4 w-4" />
              Attendees
            </MobileCardActionLink>
          )}
          <DropdownMenu
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            trigger={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
                aria-label={`More actions for ${event.title}`}
                title="More actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
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
            {canWrite && (
              <DropdownMenuItem to={toRoute('adminEventAttendance', { id: event.id })}>
                <span className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Attendance settings
                </span>
              </DropdownMenuItem>
            )}
            {canWrite && (
              <DropdownMenuItem to={toRoute('adminEventFields', { id: event.id })}>
                <span className="flex items-center gap-2">
                  <FormInput className="h-4 w-4" />
                  Registration fields
                </span>
              </DropdownMenuItem>
            )}
            {canRead && (
              <DropdownMenuItem to={toRoute('adminRegistrations', { id: event.id })}>
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Registrations
                </span>
              </DropdownMenuItem>
            )}
            {canAccessCheckIn && (
              <DropdownMenuItem to={toRoute('adminAttendanceCheckIn', { id: event.id })}>
                <span className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Check-in
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        </MobileCardActions>
      )}
    </MobileCard>
  );
}
