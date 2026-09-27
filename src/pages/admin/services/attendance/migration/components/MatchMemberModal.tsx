import { useMemo, useState } from 'react';

import { AlertCircle, Check, Loader2, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormInputField } from '@/components/ui/FormInputField';
import { SearchInputField } from '@/components/ui/SearchInputField';
import { useAdminMembersQuery } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

import {
  type EnrichedServiceAttendanceRow,
  type RowOverride,
  findMatchingFailedRows,
  getMemberNameFromRow,
} from '../types';

export interface MatchMemberModalProps {
  isOpen: boolean;
  row: EnrichedServiceAttendanceRow | null;
  allRows?: EnrichedServiceAttendanceRow[];
  onClose: () => void;
  onAssignMember: (
    rowNumber: number,
    override: RowOverride,
    options?: { applyToMatchingFailed?: boolean; matchingRowNumbers?: number[] },
  ) => void;
}

interface MatchMemberContentProps {
  row: EnrichedServiceAttendanceRow;
  allRows?: EnrichedServiceAttendanceRow[];
  onClose: () => void;
  onAssignMember: (
    rowNumber: number,
    override: RowOverride,
    options?: { applyToMatchingFailed?: boolean; matchingRowNumbers?: number[] },
  ) => void;
}

function MatchMemberContent({
  row,
  allRows = [],
  onClose,
  onAssignMember,
}: MatchMemberContentProps) {
  const csvName = getMemberNameFromRow(row.originalData);
  const initialSearch = csvName || row.rfid || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [customRfid, setCustomRfid] = useState(row.rfid || '');
  const [applyToAllMatching, setApplyToAllMatching] = useState(true);

  const matchingFailedRows = useMemo(() => {
    return findMatchingFailedRows(row, allRows);
  }, [row, allRows]);

  const { data: membersData, isLoading: isLoadingMembers } = useAdminMembersQuery({
    searchTerm: searchTerm.trim(),
    pageSize: 8,
    statusFilter: 'active',
  });

  const memberResults = useMemo(() => {
    return membersData?.pages.flatMap((page) => page.items) ?? [];
  }, [membersData]);

  const handleSelectMember = (member: AdminMember) => {
    setSelectedMember(member);
    setCustomRfid(member.member_id || customRfid || '');
  };

  const handleConfirm = () => {
    if (!selectedMember) return;

    const matchingRowNumbers = applyToAllMatching
      ? [row.row_number, ...matchingFailedRows.map((r) => r.row_number)]
      : [row.row_number];

    onAssignMember(
      row.row_number,
      {
        userId: selectedMember.id,
        memberName: selectedMember.full_name,
        rfid: customRfid.trim() || selectedMember.member_id,
      },
      {
        applyToMatchingFailed: applyToAllMatching,
        matchingRowNumbers,
      },
    );
    onClose();
  };

  return (
    <>
      <Dialog.Header showCloseButton>
        <Dialog.Title className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <span>Match Member for Row #{row.row_number}</span>
        </Dialog.Title>
        <Dialog.Description>
          Search and link an existing member profile to this attendance record.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body className="space-y-4">
        {/* Row metadata summary */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-subtle p-3.5 text-xs sm:grid-cols-4">
          <div>
            <span className="text-text-secondary">CSV Name:</span>
            <p className="font-semibold text-text">{csvName || '—'}</p>
          </div>
          <div>
            <span className="text-text-secondary">CSV RFID:</span>
            <p className="font-semibold text-text">{row.rfid || 'Missing'}</p>
          </div>
          <div>
            <span className="text-text-secondary">Service Date / Slot:</span>
            <p className="font-semibold text-text">
              {row.service_date} • {row.time_slot}
            </p>
          </div>
          <div>
            <span className="text-text-secondary">Table:</span>
            <p className="font-semibold text-text">{row.table_number || '—'}</p>
          </div>
        </div>

        {row.errors.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/75 p-2.5 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="space-y-0.5">
              {row.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="space-y-1.5">
          <label
            htmlFor="match-member-search"
            className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
          >
            Search Database Members
          </label>
          <SearchInputField
            id="match-member-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Type name, nickname, or RFID..."
            className="w-full"
          />
        </div>

        {/* Member results list */}
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-surface p-1 space-y-1">
          {isLoadingMembers ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Searching members...</span>
            </div>
          ) : memberResults.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-secondary">
              {searchTerm.trim()
                ? `No members found matching "${searchTerm.trim()}".`
                : 'No active members available.'}
            </div>
          ) : (
            memberResults.map((member) => {
              const isSelected = selectedMember?.id === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelectMember(member)}
                  className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 text-primary'
                      : 'hover:bg-surface-subtle text-text'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-text">
                      {member.full_name}
                      {member.nickname && (
                        <span className="ml-1 text-text-secondary font-normal">
                          ({member.nickname})
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      RFID: {member.member_id || 'None'}
                      {member.role ? ` • ${member.role}` : ''}
                      {member.category ? ` • ${member.category}` : ''}
                    </span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Selected member confirmation & custom RFID override */}
        {selectedMember && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">Selected Member</span>
              <span className="text-xs font-bold text-text">{selectedMember.full_name}</span>
            </div>
            <div>
              <FormInputField
                id="modal-custom-rfid"
                label="RFID / Member ID"
                value={customRfid}
                onChange={(e) => setCustomRfid(e.target.value)}
                placeholder="Enter member RFID"
                inputClassName="text-xs h-8"
              />
            </div>

            {matchingFailedRows.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-surface p-2.5 text-xs">
                <input
                  id="apply-to-matching-failed"
                  type="checkbox"
                  checked={applyToAllMatching}
                  onChange={(e) => setApplyToAllMatching(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <label
                  htmlFor="apply-to-matching-failed"
                  className="cursor-pointer select-none text-text space-y-0.5"
                >
                  <div className="font-semibold text-text">
                    Apply match to all {matchingFailedRows.length} other matching failed record
                    {matchingFailedRows.length === 1 ? '' : 's'}
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Rows sharing the same CSV name{' '}
                    {csvName ? <span className="font-medium">"{csvName}"</span> : '—'} or RFID{' '}
                    {row.rfid ? <span className="font-medium">"{row.rfid}"</span> : '—'} (Rows{' '}
                    {matchingFailedRows.map((r) => `#${r.row_number}`).join(', ')}) will also be
                    linked to {selectedMember.full_name}.
                  </p>
                </label>
              </div>
            )}
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" size="sm" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!selectedMember}
          onClick={handleConfirm}
          type="button"
        >
          {applyToAllMatching && matchingFailedRows.length > 0
            ? `Assign to ${matchingFailedRows.length + 1} Records`
            : 'Assign Member'}
        </Button>
      </Dialog.Footer>
    </>
  );
}

export function MatchMemberModal({
  isOpen,
  row,
  allRows = [],
  onClose,
  onAssignMember,
}: MatchMemberModalProps) {
  if (!row) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <MatchMemberContent
        key={`${row.row_number}-${row.rfid ?? ''}`}
        row={row}
        allRows={allRows}
        onClose={onClose}
        onAssignMember={onAssignMember}
      />
    </Dialog>
  );
}
