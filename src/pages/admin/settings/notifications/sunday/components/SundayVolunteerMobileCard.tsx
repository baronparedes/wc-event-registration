import { Bell, BellOff, CheckCircle2, XCircle } from 'lucide-react';

import {
  Avatar,
  Badge,
  MobileCard,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';
import type { SundayVolunteerRecipient } from '@/lib/domain/notifications';

import { parseSlotChips } from './parseSlotChips';

interface SundayVolunteerMobileCardProps {
  volunteer: SundayVolunteerRecipient;
}

export function SundayVolunteerMobileCard({ volunteer }: SundayVolunteerMobileCardProps) {
  return (
    <MobileCard>
      <MobileCardBody>
        <MobileCardHeader>
          <div className="flex min-w-0 items-start gap-3 w-full">
            <Avatar
              name={volunteer.full_name}
              avatarObjectKey={volunteer.avatar_object_key}
              size="md"
              className="shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold leading-snug text-text">
                  {volunteer.full_name}
                </h3>
                {volunteer.excuse_status === 'full' && (
                  <Badge variant="accent" className="text-xs">
                    Excused
                  </Badge>
                )}
                {volunteer.excuse_status === 'partial' && (
                  <Badge variant="accent" className="text-xs">
                    Partially Excused
                  </Badge>
                )}
              </div>
              {volunteer.member_id && (
                <p className="text-xs font-mono text-muted">{volunteer.member_id}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {parseSlotChips(volunteer.formatted_slots).map((chip, idx) => (
                  <Badge
                    key={`${chip.text}-${idx}`}
                    variant={chip.isExcused ? 'accent' : 'primaryOutline'}
                    className="text-xs font-normal whitespace-normal text-left"
                  >
                    {chip.text}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </MobileCardHeader>

        <MobileCardDivider />

        <MobileCardContent>
          <MobileCardContentItem
            colSpan={2}
            label="Email Address"
            value={volunteer.email || '—'}
            isMono
          />
          <MobileCardContentItem
            label="Push Status"
            value={
              volunteer.excuse_status === 'full' ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                  <BellOff className="h-3.5 w-3.5" /> Suppressed
                </span>
              ) : volunteer.has_push ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 whitespace-nowrap">
                  <Bell className="h-3.5 w-3.5" /> Subscribed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                  <BellOff className="h-3.5 w-3.5" /> No Device
                </span>
              )
            }
          />
          <MobileCardContentItem
            label="Email Status"
            value={
              volunteer.excuse_status === 'full' ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                  <XCircle className="h-3.5 w-3.5" /> Suppressed
                </span>
              ) : volunteer.has_email ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 whitespace-nowrap">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Reachable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium whitespace-nowrap">
                  <XCircle className="h-3.5 w-3.5" /> Missing Email
                </span>
              )
            }
          />
        </MobileCardContent>
      </MobileCardBody>
    </MobileCard>
  );
}
