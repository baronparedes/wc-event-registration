import { Clock, Users } from 'lucide-react';

import { Avatar, Badge, BrandAvatar } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import { type ExcusedMemberMap, isMemberExcused } from '@/lib/domain/hub-calendar';

import { groupEntriesByPrimaryRole } from '../utils';

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
    <div
      style={{ width: '960px', minWidth: '960px', maxWidth: '960px' }}
      className="w-[960px] min-w-[960px] max-w-[960px] shrink-0 box-border bg-surface p-10 text-text"
    >
      {/* Header */}
      <div className="flex flex-col border-b border-border pb-6">
        <h2 className="text-4xl font-bold uppercase tracking-tight text-text mb-2">
          {formattedDate}
        </h2>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl font-bold uppercase tracking-wider text-text">
            {LEGAL_CONFIG.appName}
          </span>
          <span className="text-xl font-bold text-text">•</span>
          <span className="text-xl font-medium text-text uppercase">Sunday Service</span>
        </div>

        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="px-4 py-2 text-base rounded-full"
            icon={<Clock className="h-5 w-5" />}
          >
            {slotLabel} Service
          </Badge>
          <Badge
            variant="outline"
            className="px-4 py-2 text-base rounded-full"
            icon={<Users className="h-5 w-5" />}
          >
            {entries.length} volunteer{entries.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      {/* Roles List */}
      <div className="mt-8">
        {entries.length === 0 ? (
          <div className="py-16 text-center text-base text-muted italic">
            No volunteers scheduled for this service
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {roleSections.map((section) => (
              <div
                key={section.primaryRole}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
              >
                {/* Role Header */}
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold uppercase tracking-wider text-text">
                    {section.primaryRole}
                  </span>
                  <Badge
                    variant="secondary"
                    className="px-3 py-0.5 text-sm font-bold rounded-full bg-slate-100 text-slate-500 border border-slate-200"
                  >
                    {section.totalCount}
                  </Badge>
                </div>

                {/* Volunteers Wrap */}
                <div className="flex flex-wrap gap-3 items-center">
                  {section.members.map(({ entry, secondaryRole }) => {
                    const excused = isMemberExcused(excusedMap, isoDateKey, entry.member, slot);
                    return (
                      <div
                        key={entry.member.id}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface pr-4 pl-1 py-1 text-base font-medium text-text shadow-sm"
                      >
                        <Avatar
                          name={entry.member.full_name}
                          avatarObjectKey={entry.member.avatar_object_key}
                          size="sm"
                          className="shrink-0"
                        />
                        <span className="font-medium whitespace-nowrap">
                          {entry.member.full_name}
                        </span>
                        {secondaryRole && (
                          <Badge
                            variant="primaryOutline"
                            className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-50"
                          >
                            +{secondaryRole}
                          </Badge>
                        )}
                        {excused && (
                          <Badge
                            variant="destructive"
                            className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full"
                          >
                            Excused
                          </Badge>
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
      <div className="mt-8 border-t border-border/60 pt-4 flex items-center justify-between text-sm text-muted">
        <span>Generated via {LEGAL_CONFIG.appName}</span>
        <span>
          {isoDateKey} • {slotLabel} Service
        </span>
      </div>
    </div>
  );
}
