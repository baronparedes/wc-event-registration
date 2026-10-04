import { Clock, Users } from 'lucide-react';

import brandLogo from '@/assets/wc-hub-brand.png';
import { Avatar } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import { type ExcusedMemberMap, isMemberExcused } from '@/lib/domain/hub-calendar';

import { groupEntriesByPrimaryRole } from './sundayScheduleShareCardUtils';

export type SundayScheduleShareCardProps = {
  slot: TimeSlot;
  slotLabel: string;
  formattedDate: string;
  isoDateKey: string;
  entries: MemberScheduleEntry[];
  excusedMap?: ExcusedMemberMap;
};

export function SundayScheduleShareCard({
  slot,
  slotLabel,
  formattedDate,
  isoDateKey,
  entries,
  excusedMap,
}: SundayScheduleShareCardProps) {
  const roleSections = groupEntriesByPrimaryRole(entries);

  return (
    <div className="w-full rounded-2xl bg-white p-6 sm:p-8 shadow-xl text-slate-900 border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <img
            src={brandLogo}
            alt={LEGAL_CONFIG.appName}
            className="h-11 w-11 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                {LEGAL_CONFIG.appName}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">Sunday Service</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{formattedDate}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-sm font-bold text-indigo-700">
            <Clock className="h-4 w-4" />
            {slotLabel} Service
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {entries.length} volunteer{entries.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Roles List */}
      <div className="mt-5">
        {entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 italic">
            No volunteers scheduled for this service
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/50">
            {roleSections.map((section) => (
              <div
                key={section.primaryRole}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 sm:p-4"
              >
                {/* Role Header (Left Column) */}
                <div className="sm:w-52 shrink-0 flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                    {section.primaryRole}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                    {section.totalCount}
                  </span>
                </div>

                {/* Volunteers Wrap (Right Column) */}
                <div className="flex-1 flex flex-wrap gap-2">
                  {section.members.map(({ entry, secondaryRole }) => {
                    const excused = isMemberExcused(excusedMap, isoDateKey, entry.member, slot);
                    return (
                      <div
                        key={entry.member.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs"
                      >
                        <Avatar
                          name={entry.member.full_name}
                          avatarObjectKey={entry.member.avatar_object_key}
                          size="xs"
                          className="shrink-0"
                        />
                        <span>{entry.member.full_name}</span>
                        {secondaryRole && (
                          <span className="rounded bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                            + {secondaryRole}
                          </span>
                        )}
                        {excused && (
                          <span className="ml-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                            Excused
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-400">
        <span>Generated via {LEGAL_CONFIG.appName}</span>
        <span>
          {isoDateKey} • {slotLabel} Service
        </span>
      </div>
    </div>
  );
}
