import { Calendar, MapPin } from 'lucide-react';

import { BrandAvatar, MarkdownRenderer } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';
import { formatEventSchedule } from '@/pages/events/[slug]/register/utils/shareEventUtils';

export type EventShareCardProps = {
  event: Pick<AdminEvent, 'title' | 'description' | 'starts_at' | 'ends_at' | 'location' | 'slug'>;
  coverUrl?: string | null;
  qrCodeDataUrl?: string | null;
};

export function EventShareCard({ event, coverUrl, qrCodeDataUrl }: EventShareCardProps) {
  return (
    <div className="w-full max-w-[560px] box-border rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 text-slate-900 shadow-xl overflow-hidden">
      {/* Header with App Branding */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 sm:pb-5">
        <div className="flex items-center gap-3">
          <BrandAvatar size="sm" alt={LEGAL_CONFIG.appName} />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {LEGAL_CONFIG.appName}
            </span>
            <p className="text-sm font-semibold text-slate-900">Event Registration</p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          Register Now
        </span>
      </div>

      {/* Cover Image if present */}
      {coverUrl && (
        <div className="relative mt-5 sm:mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <img
            src={coverUrl}
            alt={event.title}
            crossOrigin="anonymous"
            loading="eager"
            decoding="sync"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Event Details */}
      <div className="mt-5 sm:mt-6 space-y-3 text-center">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {event.title}
        </h2>

        {event.description && (
          <div className="mx-auto max-w-lg text-xs sm:text-sm text-slate-600 break-words overflow-hidden">
            <MarkdownRenderer
              content={event.description}
              className="prose-sm text-slate-600 leading-relaxed text-center [&_ul]:list-none [&_ul]:pl-0 [&_li]:pl-0"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2 max-w-full">
          <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-100/90 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-base font-bold text-slate-900">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{formatEventSchedule(event.starts_at, event.ends_at)}</span>
          </div>

          {event.location && (
            <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-100/90 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-base font-bold text-slate-900">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Centered QR Code Section */}
      {qrCodeDataUrl && (
        <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center border-t border-slate-100 pt-5 sm:pt-6 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3">
            <img
              src={qrCodeDataUrl}
              alt="Scan QR code for event registration"
              loading="eager"
              decoding="sync"
              className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
            />
          </div>
          <span className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Scan to Register
          </span>
        </div>
      )}
    </div>
  );
}
