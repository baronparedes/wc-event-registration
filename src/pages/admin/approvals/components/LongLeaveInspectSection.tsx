import { Calendar, FileText } from 'lucide-react';

import { Badge } from '@/components/ui';
import type { ApprovalRequest } from '@/lib/domain/approvals';
import { formatDateOnly } from '@/lib/infrastructure';

import { extractServicesList, getSundayDurationInfo } from './helpers';

export interface LongLeaveInspectSectionProps {
  request: ApprovalRequest;
}

export function LongLeaveInspectSection({ request }: LongLeaveInspectSectionProps) {
  const meta = request.metadata || {};
  const startDate = meta.start_date ? String(meta.start_date) : '';
  const endDate = meta.end_date ? String(meta.end_date) : '';
  const services = extractServicesList(meta.services);
  const reason = meta.reason ? String(meta.reason) : request.summary || '';
  const durationInfo = getSundayDurationInfo(startDate, endDate);

  const extraEntries = Object.entries(meta).filter(
    ([key, val]) =>
      ![
        'start_date',
        'end_date',
        'services',
        'reason',
        'is_long_leave',
        'access_token',
        'token_expires_at',
        'token',
        'form_field_id',
        'field_key',
      ].includes(key) &&
      val != null &&
      val !== '',
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 pt-1">
        <div>
          <h4 className="font-heading text-sm font-bold text-text">Volunteer Long Leave Details</h4>
          <p className="text-xs text-muted">
            Leave schedule, affected Sunday services, and volunteer justification.
          </p>
        </div>
        <Badge variant="outline">2 Sections</Badge>
      </div>

      {/* Section 1: Leave Schedule & Services */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <h5 className="font-heading text-sm font-semibold text-text">
            Leave Schedule & Services
          </h5>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <span className="text-xs font-medium text-muted block">Start Date (Sunday)</span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-text text-sm">{formatDateOnly(startDate)}</span>
              {startDate && <span className="text-xs text-muted">({startDate})</span>}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-muted block">End Date (Sunday)</span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-text text-sm">{formatDateOnly(endDate)}</span>
              {endDate && <span className="text-xs text-muted">({endDate})</span>}
            </div>
          </div>
          {durationInfo && (
            <div>
              <span className="text-xs font-medium text-muted block">Leave Duration</span>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-text text-sm">
                  {durationInfo.sundays} {durationInfo.sundays === 1 ? 'Sunday' : 'Sundays'}
                </span>
                <span className="text-xs text-muted">({durationInfo.days} days)</span>
              </div>
            </div>
          )}
          <div>
            <span className="text-xs font-medium text-muted block">Excused Service Timeslots</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {services.length > 0 ? (
                services.map((svc) => (
                  <Badge key={svc} variant="outline" className="text-xs">
                    {svc}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted italic">All Sunday Service Commitments</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Reason for Leave */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <h5 className="font-heading text-sm font-semibold text-text">Reason for Leave</h5>
        </div>
        <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-3 text-sm text-text leading-relaxed">
          {reason || 'No reason provided.'}
        </p>
      </div>

      {/* Extra Metadata Section (if any unmapped fields) */}
      {extraEntries.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
          <h5 className="font-heading text-sm font-semibold text-text">Additional Information</h5>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {extraEntries.map(([key, val]) => (
              <div key={key}>
                <dt className="text-muted capitalize">{key.replace(/_/g, ' ')}</dt>
                <dd className="font-medium text-text mt-0.5 break-words">{String(val)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
