import { Calendar, MapPin } from 'lucide-react';

import { BrandAvatar, MarkdownRenderer } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';
import { formatDateTime } from '@/lib/infrastructure';

export type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type CountdownShareCardProps = {
  event: Pick<AdminEvent, 'title' | 'description' | 'starts_at' | 'location' | 'slug'>;
  coverUrl?: string | null;
  timeLeft: TimeLeft;
  qrCodeDataUrl?: string | null;
};

export function CountdownShareCard({
  event,
  coverUrl,
  timeLeft,
  qrCodeDataUrl,
}: CountdownShareCardProps) {
  return (
    <div className="w-full max-w-[560px] box-border rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-slate-900 shadow-xl">
      {/* Header with App Branding */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <BrandAvatar size="sm" alt={LEGAL_CONFIG.appName} />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {LEGAL_CONFIG.appName}
            </span>
            <p className="text-sm font-semibold text-slate-900">Event Countdown</p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          Upcoming Event
        </span>
      </div>

      {/* Cover Image if present */}
      {coverUrl && (
        <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-xs">
          <img
            src={coverUrl}
            alt={event.title}
            crossOrigin="anonymous"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Event Details */}
      <div className="mt-6 space-y-3 text-center">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {event.title}
        </h2>

        {event.description && (
          <div className="mx-auto max-w-lg text-sm text-slate-600">
            <MarkdownRenderer
              content={event.description}
              className="prose-sm text-slate-600 leading-relaxed max-h-24 overflow-hidden text-center"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-100/90 px-4 py-2.5 text-sm sm:text-base font-bold text-slate-900 shadow-2xs">
            <Calendar className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <span>{event.starts_at ? formatDateTime(event.starts_at) : 'Date TBA'}</span>
          </div>

          {event.location && (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-100/90 px-4 py-2.5 text-sm sm:text-base font-bold text-slate-900 shadow-2xs max-w-full sm:max-w-xs">
              <MapPin className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Digits Grid */}
      <div className="mt-8 grid grid-cols-4 gap-3">
        <CountdownDigitCard label="Days" value={timeLeft.days} />
        <CountdownDigitCard label="Hours" value={timeLeft.hours} />
        <CountdownDigitCard label="Mins" value={timeLeft.minutes} />
        <CountdownDigitCard label="Secs" value={timeLeft.seconds} />
      </div>

      {/* Centered QR Code Section */}
      {qrCodeDataUrl && (
        <div className="mt-8 flex flex-col items-center justify-center border-t border-slate-100 pt-6 text-center">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 shadow-xs">
            <img
              src={qrCodeDataUrl}
              alt="Scan QR code for event countdown"
              className="h-28 w-28 rounded-xl bg-white p-1 border border-slate-100 object-contain shadow-2xs"
            />
          </div>
          <span className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Scan to Open Countdown
          </span>
        </div>
      )}
    </div>
  );
}

function CountdownDigitCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/80 px-2 py-4">
      <span className="text-3xl font-black tabular-nums tracking-tight text-primary">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
        {label}
      </span>
    </div>
  );
}
