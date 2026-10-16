import { useMemo, useState } from 'react';

import { Bell, BellOff, CheckCircle2, Search, XCircle } from 'lucide-react';

import {
  Avatar,
  Badge,
  EmptyState,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
  SearchInputField,
} from '@/components/ui';
import { useIsMobileViewport } from '@/hooks/utils';
import type { SundayVolunteerRecipient } from '@/lib/domain/notifications';
import { formatDateOnly } from '@/lib/infrastructure/dateFormat';

import { SundayVolunteerMobileCard } from './SundayVolunteerMobileCard';
import { parseSlotChips } from './parseSlotChips';

interface SundayVolunteersTableProps {
  volunteers: SundayVolunteerRecipient[];
  isLoading?: boolean;
  sundayDate?: string;
}

export function SundayVolunteersTable({
  volunteers,
  isLoading = false,
  sundayDate,
}: SundayVolunteersTableProps) {
  const isMobileViewport = useIsMobileViewport();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVolunteers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return volunteers;
    return volunteers.filter((v) => {
      const nameMatch = v.full_name.toLowerCase().includes(normalized);
      const emailMatch = v.email?.toLowerCase().includes(normalized);
      const memberIdMatch = v.member_id?.toLowerCase().includes(normalized);
      const slotsMatch = v.formatted_slots.toLowerCase().includes(normalized);
      const excuseMatch =
        (v.excuse_status === 'full' && 'excused'.includes(normalized)) ||
        (v.excuse_status === 'partial' &&
          ('partial'.includes(normalized) || 'excused'.includes(normalized)));
      return nameMatch || emailMatch || memberIdMatch || slotsMatch || excuseMatch;
    });
  }, [volunteers, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-heading text-sm font-semibold text-text">Scheduled Volunteers</h4>
          <Badge variant="outline" className="text-xs">
            {volunteers.length}
          </Badge>
        </div>
        <div className="w-full sm:w-72">
          <SearchInputField
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Search volunteers or slots..."
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted">Loading scheduled volunteers...</div>
      ) : volunteers.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8">
          <EmptyState
            icon={<Search className="h-8 w-8 text-muted" />}
            title="No scheduled volunteers found"
            description={`No volunteers have commitments configured on ${formatDateOnly(sundayDate || null)}.`}
          />
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8">
          <EmptyState
            icon={<Search className="h-8 w-8 text-muted" />}
            title="No matches found"
            description={`No scheduled volunteers match "${searchTerm}".`}
          />
        </div>
      ) : isMobileViewport ? (
        <div className="space-y-3">
          {filteredVolunteers.map((volunteer) => (
            <SundayVolunteerMobileCard key={volunteer.user_id} volunteer={volunteer} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <ListTable>
            <ListTableHead>
              <ListTableHeaderRow>
                <ListTableHeaderCell>Volunteer</ListTableHeaderCell>
                <ListTableHeaderCell>Email Address</ListTableHeaderCell>
                <ListTableHeaderCell>Scheduled Slots</ListTableHeaderCell>
                <ListTableHeaderCell align="center" className="text-center whitespace-nowrap">
                  Push Status
                </ListTableHeaderCell>
                <ListTableHeaderCell align="center" className="text-center whitespace-nowrap">
                  Email Status
                </ListTableHeaderCell>
              </ListTableHeaderRow>
            </ListTableHead>
            <ListTableBody>
              {filteredVolunteers.map((volunteer) => (
                <ListTableRow key={volunteer.user_id}>
                  <ListTableCell>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={volunteer.full_name}
                        avatarObjectKey={volunteer.avatar_object_key}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text">{volunteer.full_name}</p>
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
                          <p className="text-xs text-muted font-mono">{volunteer.member_id}</p>
                        )}
                      </div>
                    </div>
                  </ListTableCell>
                  <ListTableCell>
                    <span className="text-xs text-muted font-mono">{volunteer.email || '—'}</span>
                  </ListTableCell>
                  <ListTableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {parseSlotChips(volunteer.formatted_slots).map((chip, idx) => (
                        <Badge
                          key={`${chip.text}-${idx}`}
                          variant={chip.isExcused ? 'accent' : 'primaryOutline'}
                          className="text-xs font-normal"
                        >
                          {chip.text}
                        </Badge>
                      ))}
                    </div>
                  </ListTableCell>
                  <ListTableCell align="center">
                    <div className="flex items-center justify-center">
                      {volunteer.excuse_status === 'full' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                          <BellOff className="h-3.5 w-3.5" /> Suppressed
                        </span>
                      ) : volunteer.has_push ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
                          <Bell className="h-3.5 w-3.5" /> Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted whitespace-nowrap">
                          <BellOff className="h-3.5 w-3.5" /> No Device
                        </span>
                      )}
                    </div>
                  </ListTableCell>
                  <ListTableCell align="center">
                    <div className="flex items-center justify-center">
                      {volunteer.excuse_status === 'full' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                          <XCircle className="h-3.5 w-3.5" /> Suppressed
                        </span>
                      ) : volunteer.has_email ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Reachable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500 whitespace-nowrap">
                          <XCircle className="h-3.5 w-3.5" /> Missing Email
                        </span>
                      )}
                    </div>
                  </ListTableCell>
                </ListTableRow>
              ))}
            </ListTableBody>
          </ListTable>
        </div>
      )}
    </div>
  );
}
