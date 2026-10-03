import { useMemo, useState } from 'react';

import { Bell, BellOff, CheckCircle2, Search, XCircle } from 'lucide-react';

import {
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
import type { SundayVolunteerRecipient } from '@/lib/domain/notifications';

interface SundayVolunteersTableProps {
  volunteers: SundayVolunteerRecipient[];
  isLoading?: boolean;
}

export function SundayVolunteersTable({
  volunteers,
  isLoading = false,
}: SundayVolunteersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVolunteers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return volunteers;
    return volunteers.filter((v) => {
      const nameMatch = v.full_name.toLowerCase().includes(normalized);
      const emailMatch = v.email?.toLowerCase().includes(normalized);
      const memberIdMatch = v.member_id?.toLowerCase().includes(normalized);
      const slotsMatch = v.formatted_slots.toLowerCase().includes(normalized);
      return nameMatch || emailMatch || memberIdMatch || slotsMatch;
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
            description="No volunteers have commitments configured for this specific Sunday."
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
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <ListTable>
            <ListTableHead>
              <ListTableHeaderRow>
                <ListTableHeaderCell>Volunteer</ListTableHeaderCell>
                <ListTableHeaderCell>Email Address</ListTableHeaderCell>
                <ListTableHeaderCell>Scheduled Slots</ListTableHeaderCell>
                <ListTableHeaderCell align="center">Push Status</ListTableHeaderCell>
                <ListTableHeaderCell align="center">Email Status</ListTableHeaderCell>
              </ListTableHeaderRow>
            </ListTableHead>
            <ListTableBody>
              {filteredVolunteers.map((volunteer) => (
                <ListTableRow key={volunteer.user_id}>
                  <ListTableCell>
                    <div>
                      <p className="font-medium text-text">{volunteer.full_name}</p>
                      {volunteer.member_id && (
                        <p className="text-xs text-muted font-mono">{volunteer.member_id}</p>
                      )}
                    </div>
                  </ListTableCell>
                  <ListTableCell>
                    <span className="text-xs text-muted font-mono">{volunteer.email || '—'}</span>
                  </ListTableCell>
                  <ListTableCell>
                    <Badge variant="primaryOutline" className="text-xs font-normal">
                      {volunteer.formatted_slots}
                    </Badge>
                  </ListTableCell>
                  <ListTableCell align="center">
                    {volunteer.has_push ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Bell className="h-3.5 w-3.5" /> Subscribed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <BellOff className="h-3.5 w-3.5" /> No Device
                      </span>
                    )}
                  </ListTableCell>
                  <ListTableCell align="center">
                    {volunteer.has_email ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Reachable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                        <XCircle className="h-3.5 w-3.5" /> Missing Email
                      </span>
                    )}
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
