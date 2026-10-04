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
    <div className="w-full rounded-2xl bg-surface p-6 sm:p-8 shadow-xl text-text border border-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <BrandAvatar
            size="sm"
            alt={LEGAL_CONFIG.appName}
            className="border border-border shadow-2xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {LEGAL_CONFIG.appName}
              </span>
              <span className="text-muted">•</span>
              <span className="text-xs font-medium text-muted">Sunday Service</span>
            </div>
            <h2 className="text-lg font-bold text-text">{formattedDate}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="primaryOutline" icon={<Clock className="h-3.5 w-3.5" />}>
            {slotLabel} Service
          </Badge>
          <Badge variant="outline" icon={<Users className="h-3.5 w-3.5" />}>
            {entries.length} volunteer{entries.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      {/* Roles List */}
      <div className="mt-5">
        {entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted italic">
            No volunteers scheduled for this service
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-background/50">
            {roleSections.map((section) => (
              <div
                key={section.primaryRole}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 sm:p-4"
              >
                {/* Role Header (Left Column) */}
                <div className="sm:w-52 shrink-0 flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {section.primaryRole}
                  </span>
                  <Badge variant="primaryOutline" className="px-2 py-0.5 text-[11px] font-bold">
                    {section.totalCount}
                  </Badge>
                </div>

                {/* Volunteers Wrap (Right Column) */}
                <div className="flex-1 flex flex-wrap gap-2">
                  {section.members.map(({ entry, secondaryRole }) => {
                    const excused = isMemberExcused(excusedMap, isoDateKey, entry.member, slot);
                    return (
                      <div
                        key={entry.member.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text shadow-2xs"
                      >
                        <Avatar
                          name={entry.member.full_name}
                          avatarObjectKey={entry.member.avatar_object_key}
                          size="xs"
                          className="shrink-0"
                        />
                        <span>{entry.member.full_name}</span>
                        {secondaryRole && (
                          <Badge
                            variant="primaryOutline"
                            className="px-1.5 py-0.5 text-[10px] font-semibold"
                          >
                            + {secondaryRole}
                          </Badge>
                        )}
                        {excused && (
                          <Badge
                            variant="destructive"
                            className="ml-0.5 px-1.5 py-0.5 text-[9px] font-bold"
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
      <div className="mt-6 border-t border-border/60 pt-3 flex items-center justify-between text-xs text-muted">
        <span>Generated via {LEGAL_CONFIG.appName}</span>
        <span>
          {isoDateKey} • {slotLabel} Service
        </span>
      </div>
    </div>
  );
}
