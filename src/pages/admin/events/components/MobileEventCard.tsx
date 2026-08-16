import { useState } from 'react';

import { Edit, MoreHorizontal, Users } from 'lucide-react';

import { Button } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import {
  toAdminEventAttendance,
  toAdminEventAttendanceCheckIn,
  toAdminEventAttendanceData,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventRegistrations,
} from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';
import { formatDateOnly } from '@/lib/infrastructure';

import { DuplicatePolicyLabel } from './DuplicatePolicyLabel';
import { EventStatusBadge } from './EventStatusBadge';

type MobileEventCardProps = {
  event: AdminEvent;
  canWrite: boolean;
  canRead: boolean;
  canAccessCheckIn: boolean;
};

export function MobileEventCard({
  event,
  canWrite,
  canRead,
  canAccessCheckIn,
}: MobileEventCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <article className="relative rounded-xl border border-border/60 bg-background shadow-sm">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-text">{event.title}</h2>
            <p className="mt-0.5 truncate text-xs text-muted">{event.slug}</p>
          </div>
          <EventStatusBadge status={event.status} />
        </div>

        <dl className="grid grid-cols-3 py-2.5">
          <div className="pr-2">
            <dt className="text-xs text-muted">Starts</dt>
            <dd className="mt-0.5 text-sm font-medium text-text">
              {formatDateOnly(event.starts_at)}
            </dd>
          </div>
          <div className="px-2">
            <dt className="text-xs text-muted">Reg. mode</dt>
            <dd className="mt-0.5 truncate text-sm font-medium capitalize text-text">
              {event.registration_mode}
            </dd>
          </div>
          <div className="pl-2">
            <dt className="text-xs text-muted">Policy</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-text">
              <DuplicatePolicyLabel policy={event.duplicate_policy} />
            </dd>
          </div>
        </dl>
      </div>

      <div
        className={`flex divide-x divide-border border-t border-border bg-surface ${
          canWrite ? 'rounded-b-xl' : 'rounded-b-lg'
        }`}
      >
        {canWrite && (
          <ActionLink
            to={toAdminEventDetail(event.id)}
            title="Edit event"
            aria-label={`Edit ${event.title}`}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-bl-xl text-sm font-medium text-primary no-underline hover:bg-primary/10"
          >
            <Edit className="h-4 w-4" />
            Edit
          </ActionLink>
        )}
        {canRead && (
          <ActionLink
            to={toAdminEventAttendanceData(event.id)}
            title="View attendees"
            aria-label={`View attendees for ${event.title}`}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 bg-primary text-sm font-semibold text-white no-underline shadow-sm hover:bg-primary/90 hover:shadow-md ${
              canWrite ? '' : 'rounded-bl-lg'
            }`}
          >
            <Users className="h-4 w-4" />
            Attendees
          </ActionLink>
        )}
        {(canWrite || canRead || canAccessCheckIn) && (
          <DropdownMenu
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            trigger={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                className={`flex min-h-11 w-12 items-center justify-center text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30 ${
                  canWrite ? 'rounded-br-xl' : 'rounded-br-lg'
                }`}
                aria-label={`More actions for ${event.title}`}
                title="More actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            }
          >
            {canWrite && (
              <DropdownMenuItem to={toAdminEventDetail(event.id)}>Edit event</DropdownMenuItem>
            )}
            {canWrite && (
              <DropdownMenuItem to={toAdminEventAttendance(event.id)}>
                Attendance settings
              </DropdownMenuItem>
            )}
            {canWrite && (
              <DropdownMenuItem to={toAdminEventFields(event.id)}>
                Registration fields
              </DropdownMenuItem>
            )}
            {canRead && (
              <DropdownMenuItem to={toAdminEventRegistrations(event.id)}>
                Registrations
              </DropdownMenuItem>
            )}
            {canAccessCheckIn && (
              <DropdownMenuItem to={toAdminEventAttendanceCheckIn(event.id)}>
                Check-in
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        )}
      </div>
    </article>
  );
}
