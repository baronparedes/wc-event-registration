import { Users } from 'lucide-react';

import { Badge, BrandAvatar } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import { type ExcusedMemberMap, isMemberExcused } from '@/lib/domain/hub-calendar';

import { parseMemberRole } from '../utils';

export type SundayScheduleShareCardProps = {
  slot: TimeSlot;
  slotLabel: string;
  formattedDate: string;
  isoDateKey: string;
  entries: MemberScheduleEntry[];
  excusedMap?: ExcusedMemberMap;
};

type ActiveRoleSection = {
  primaryRole: string;
  entries: MemberScheduleEntry[];
};

function formatMemberName(member: {
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
}): string {
  if (member.last_name?.trim() && member.first_name?.trim()) {
    return `${member.last_name.trim()}, ${member.first_name.trim()}`;
  }
  return member.full_name;
}

function compareEntries(a: MemberScheduleEntry, b: MemberScheduleEntry): number {
  const lastNameA = (a.member.last_name || '').trim();
  const lastNameB = (b.member.last_name || '').trim();
  const lastCmp = lastNameA.localeCompare(lastNameB, undefined, { sensitivity: 'base' });
  if (lastCmp !== 0) return lastCmp;

  const firstNameA = (a.member.first_name || a.member.full_name || '').trim();
  const firstNameB = (b.member.first_name || b.member.full_name || '').trim();
  return firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base' });
}

function splitIntoColumns<T>(items: T[], numCols: number = 4): T[][] {
  if (items.length === 0) return [];
  const rowsPerCol = Math.ceil(items.length / numCols);
  return Array.from({ length: numCols }, (_, colIndex) =>
    items.slice(colIndex * rowsPerCol, (colIndex + 1) * rowsPerCol),
  );
}

function groupActiveEntriesByPrimaryRole(entries: MemberScheduleEntry[]): ActiveRoleSection[] {
  const map = new Map<string, MemberScheduleEntry[]>();

  for (const entry of entries) {
    const { primaryRole } = parseMemberRole(entry.member.role);
    if (!map.has(primaryRole)) {
      map.set(primaryRole, []);
    }
    map.get(primaryRole)!.push(entry);
  }

  const result: ActiveRoleSection[] = [];
  for (const [primaryRole, roleEntries] of map.entries()) {
    roleEntries.sort(compareEntries);
    result.push({
      primaryRole,
      entries: roleEntries,
    });
  }

  return result.sort((a, b) => a.primaryRole.localeCompare(b.primaryRole));
}

export function SundayScheduleShareCard({
  slot,
  slotLabel,
  formattedDate,
  isoDateKey,
  entries,
  excusedMap,
}: SundayScheduleShareCardProps) {
  const activeEntries: MemberScheduleEntry[] = [];
  const excusedEntries: MemberScheduleEntry[] = [];

  for (const entry of entries) {
    if (isMemberExcused(excusedMap, isoDateKey, entry.member, slot)) {
      excusedEntries.push(entry);
    } else {
      activeEntries.push(entry);
    }
  }

  const roleSections = groupActiveEntriesByPrimaryRole(activeEntries);
  excusedEntries.sort(compareEntries);
  const excusedColumns = splitIntoColumns(excusedEntries, 4);

  return (
    <div
      style={{ width: '960px', minWidth: '960px', maxWidth: '960px' }}
      className="w-[960px] min-w-[960px] max-w-[960px] shrink-0 box-border bg-surface p-10 text-text"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        {/* Brand Avatar + Timeslot & Date */}
        <div className="flex items-center gap-4">
          <BrandAvatar size="md" alt={LEGAL_CONFIG.appName} />
          <div>
            <h1 className="text-4xl font-extrabold uppercase tracking-tight text-text">
              {slotLabel} Service
            </h1>
            <p className="text-base font-semibold text-muted mt-0.5">{formattedDate}</p>
          </div>
        </div>

        {/* Volunteer Count & Excused Badges */}
        <div className="flex items-center gap-2">
          <Badge icon={<Users className="h-5 w-5" />}>
            {activeEntries.length} volunteer{activeEntries.length === 1 ? '' : 's'}
          </Badge>
          {excusedEntries.length > 0 && <Badge>{excusedEntries.length} excused</Badge>}
        </div>
      </div>

      {/* Role Sections (4 Columns per Primary Role) */}
      <div className="mt-8 flex flex-col gap-6">
        {roleSections.length === 0 ? (
          <div className="py-12 text-center text-base text-muted italic">
            No volunteers scheduled for this service
          </div>
        ) : (
          roleSections.map((section) => {
            const columns = splitIntoColumns(section.entries, 4);
            return (
              <div key={section.primaryRole} className="flex flex-col">
                {/* Role Header */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/80">
                  <span className="text-base font-bold uppercase tracking-wider text-text">
                    {section.primaryRole}
                  </span>
                  <Badge>{section.entries.length}</Badge>
                </div>

                {/* 4-column names table */}
                <div className="grid grid-cols-4 gap-6">
                  {columns.map((column, colIdx) => (
                    <div key={colIdx} className="flex flex-col">
                      {column.map((entry) => (
                        <div
                          key={entry.member.id}
                          className="py-1.5 border-b border-border/40 text-sm font-medium text-text truncate"
                        >
                          {formatMemberName(entry.member)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Excused Section */}
      {excusedEntries.length > 0 && (
        <div className="mt-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/80">
            <span className="text-base font-bold uppercase tracking-wider text-muted">Excused</span>
            <Badge>{excusedEntries.length}</Badge>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {excusedColumns.map((column, colIdx) => (
              <div key={colIdx} className="flex flex-col">
                {column.map((entry) => (
                  <div
                    key={entry.member.id}
                    className="py-1.5 border-b border-border/40 text-sm font-medium text-muted truncate"
                  >
                    {formatMemberName(entry.member)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

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
