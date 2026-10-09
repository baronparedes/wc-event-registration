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
              <h3 className="text-base font-semibold leading-snug text-text">
                {volunteer.full_name}
              </h3>
              {volunteer.member_id && (
                <p className="text-xs font-mono text-muted">{volunteer.member_id}</p>
              )}
              <div className="pt-0.5">
                <Badge
                  variant="primaryOutline"
                  className="text-xs font-normal whitespace-normal text-left"
                >
                  {volunteer.formatted_slots}
                </Badge>
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
              volunteer.has_push ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <Bell className="h-3.5 w-3.5" /> Subscribed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <BellOff className="h-3.5 w-3.5" /> No Device
                </span>
              )
            }
          />
          <MobileCardContentItem
            label="Email Status"
            value={
              volunteer.has_email ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Reachable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium">
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
