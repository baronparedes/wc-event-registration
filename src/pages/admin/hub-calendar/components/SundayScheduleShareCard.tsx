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
      style={{ width: '1920px', minWidth: '1920px', maxWidth: '1920px' }}
      className="w-[1920px] min-w-[1920px] max-w-[1920px] shrink-0 box-border rounded-3xl bg-surface p-10 shadow-xl text-text border border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <BrandAvatar
            size="md"
            alt={LEGAL_CONFIG.appName}
            className="border border-border shadow-2xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wider text-primary">
                {LEGAL_CONFIG.appName}
              </span>
              <span className="text-muted">•</span>
              <span className="text-sm font-medium text-muted">Sunday Service</span>
            </div>
            <h2 className="text-2xl font-bold text-text">{formattedDate}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="primaryOutline"
            className="px-3.5 py-1.5 text-sm"
            icon={<Clock className="h-4 w-4" />}
          >
            {slotLabel} Service
          </Badge>
          <Badge
            variant="outline"
            className="px-3.5 py-1.5 text-sm"
            icon={<Users className="h-4 w-4" />}
          >
            {entries.length} volunteer{entries.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      {/* Roles List */}
      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="py-16 text-center text-base text-muted italic">
            No volunteers scheduled for this service
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-background/50">
            {roleSections.map((section) => (
              <div key={section.primaryRole} className="flex flex-row items-center gap-6 p-5">
                {/* Role Header (Left Column) */}
                <div className="w-64 shrink-0 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold uppercase tracking-wider text-primary">
                    {section.primaryRole}
                  </span>
                  <Badge variant="primaryOutline" className="px-2.5 py-0.5 text-xs font-bold">
                    {section.totalCount}
                  </Badge>
                </div>

                {/* Volunteers Wrap (Right Column) */}
                <div className="flex-1 flex flex-wrap gap-2.5 items-center">
                  {section.members.map(({ entry, secondaryRole }) => {
                    const excused = isMemberExcused(excusedMap, isoDateKey, entry.member, slot);
                    return (
                      <div
                        key={entry.member.id}
                        className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text shadow-2xs"
                      >
                        <Avatar
                          name={entry.member.full_name}
                          avatarObjectKey={entry.member.avatar_object_key}
                          size="xs"
                          className="shrink-0"
                        />
                        <span className="font-medium">{entry.member.full_name}</span>
                        {secondaryRole && (
                          <Badge
                            variant="primaryOutline"
                            className="px-2 py-0.5 text-xs font-semibold"
                          >
                            + {secondaryRole}
                          </Badge>
                        )}
                        {excused && (
                          <Badge
                            variant="destructive"
                            className="ml-0.5 px-2 py-0.5 text-xs font-bold"
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
