import { useEffect, useMemo, useRef } from 'react';

import { toast } from 'sonner';

import {
  type LookupUserByNameResult,
  type LookupUserByRfidResult,
  useLookupUsersByNamesQuery,
  useLookupUsersByRfidsQuery,
} from '@/hooks/domain/services';
import {
  type ServiceAttendanceCsvPreviewRow,
  USHER_BACKROOM_TABLE,
  mapServiceAttendanceTableNumber,
} from '@/lib/domain/services';

import { type EnrichedServiceAttendanceRow, getMemberNameFromRow } from '../types';

interface UseAttendanceMigrationEnrichmentProps {
  rawRows: ServiceAttendanceCsvPreviewRow[];
  seats: Array<{ id: string; table_number: string }> | undefined;
  isParsingCsv: boolean;
  fileInputKey: number;
}

export function useAttendanceMigrationEnrichment({
  rawRows,
  seats,
  isParsingCsv,
  fileInputKey,
}: UseAttendanceMigrationEnrichmentProps) {
  const rfidsToLookup = useMemo(() => {
    return Array.from(new Set(rawRows.map((r) => r.rfid).filter(Boolean)));
  }, [rawRows]);

  const {
    data: usersByRfid,
    isLoading: isLoadingRfids,
    error: rfidLookupError,
  } = useLookupUsersByRfidsQuery(rfidsToLookup);

  const rfidToUserMap = useMemo(() => {
    const map = new Map<string, LookupUserByRfidResult>();
    (usersByRfid ?? []).forEach((u) => map.set(u.member_id, u));
    return map;
  }, [usersByRfid]);

  const namesToLookup = useMemo(() => {
    if (rawRows.length === 0 || isLoadingRfids) return [];
    const set = new Set<string>();
    rawRows.forEach((row) => {
      if (!rfidToUserMap.has(row.rfid)) {
        const name = getMemberNameFromRow(row.originalData);
        if (name) set.add(name);
      }
    });
    return Array.from(set);
  }, [rawRows, isLoadingRfids, rfidToUserMap]);

  const {
    data: usersByName,
    isLoading: isLoadingNames,
    error: nameLookupError,
  } = useLookupUsersByNamesQuery(namesToLookup);

  const nameToUserMap = useMemo(() => {
    const map = new Map<string, LookupUserByNameResult>();
    (usersByName ?? []).forEach((u) => {
      // 1. Primary: nickname + ' ' + last name
      const nickname = (u.nickname ?? '').trim();
      const lastName = (u.last_name ?? '').trim();
      if (nickname && lastName) {
        map.set(`${nickname} ${lastName}`.toLowerCase(), u);
      }

      // 2. Fallback: full_name
      if (u.full_name) {
        const fullNameKey = u.full_name.trim().toLowerCase();
        if (!map.has(fullNameKey)) {
          map.set(fullNameKey, u);
        }
      }

      // 3. Fallback: first_name + ' ' + last_name
      const firstName = (u.first_name ?? '').trim();
      if (firstName && lastName) {
        const firstLast = `${firstName} ${lastName}`.toLowerCase();
        if (!map.has(firstLast)) {
          map.set(firstLast, u);
        }
      }
    });
    return map;
  }, [usersByName]);

  const isLoadingLookups =
    (isLoadingRfids && rfidsToLookup.length > 0) || (isLoadingNames && namesToLookup.length > 0);

  const isProcessing = isParsingCsv || isLoadingLookups;

  const tableToSeatIdMap = useMemo(() => {
    const map = new Map<string, string>();
    (seats ?? []).forEach((s) => {
      map.set(s.table_number.toLowerCase(), s.id);
    });
    return map;
  }, [seats]);

  const previewRows = useMemo<EnrichedServiceAttendanceRow[]>(() => {
    if (rawRows.length === 0) return [];

    return rawRows.map((row) => {
      const enriched: EnrichedServiceAttendanceRow = { ...row, errors: [...row.errors] };
      const rowName = getMemberNameFromRow(row.originalData);
      const normalizedRowName = rowName.trim().replace(/\s+/g, ' ').toLowerCase();

      // Try matching by RFID first, then fallback to nickname + last name / name matching
      const matchedUser =
        (row.rfid ? rfidToUserMap.get(row.rfid) : undefined) ??
        (normalizedRowName ? nameToUserMap.get(normalizedRowName) : undefined);

      const effectiveTableNumber = mapServiceAttendanceTableNumber(row.table_number);
      enriched.table_number = effectiveTableNumber;

      if (
        effectiveTableNumber === USHER_BACKROOM_TABLE &&
        row.table_number !== USHER_BACKROOM_TABLE
      ) {
        enriched.metadata = {
          ...enriched.metadata,
          original_table_number: enriched.metadata.original_table_number ?? row.table_number,
        };
      }

      const seatId = effectiveTableNumber
        ? tableToSeatIdMap.get(effectiveTableNumber.toLowerCase())
        : undefined;

      if (matchedUser) {
        enriched.user_id = matchedUser.id;
        enriched.member_name = matchedUser.full_name;
        if (!enriched.rfid && matchedUser.member_id) {
          enriched.rfid = matchedUser.member_id;
        }
        enriched.errors = enriched.errors.filter((e) => e !== 'RFID is missing');
        enriched.isValid = enriched.errors.length === 0;
      } else {
        enriched.isValid = false;
        if (rowName) {
          enriched.errors.push(
            `Member "${rowName}" (RFID: ${row.rfid || 'N/A'}) not found in system.`,
          );
        } else {
          enriched.errors.push(`RFID ${row.rfid} not found in system.`);
        }
      }

      if (seatId) {
        enriched.service_seat_id = seatId;
      } else {
        enriched.isValid = false;
        enriched.errors.push(
          `Table ${effectiveTableNumber || row.table_number} not found in selected layout.`,
        );
      }

      return enriched;
    });
  }, [rawRows, rfidToUserMap, nameToUserMap, tableToSeatIdMap]);

  const notifiedFileKeyRef = useRef<number>(-1);
  useEffect(() => {
    if (rawRows.length === 0 || isProcessing || notifiedFileKeyRef.current === fileInputKey) {
      return;
    }
    notifiedFileKeyRef.current = fileInputKey;

    const unresolved = previewRows
      .filter((r) => !r.user_id)
      .map((r) => {
        const name = getMemberNameFromRow(r.originalData);
        return name ? `"${name}" (RFID: ${r.rfid || 'N/A'})` : `RFID: ${r.rfid}`;
      });
    const uniqueUnresolved = Array.from(new Set(unresolved));

    if (uniqueUnresolved.length > 0) {
      toast.error(`Could not resolve member(s): ${uniqueUnresolved.join(', ')}`);
    } else {
      toast.success('CSV parsed and validated');
    }
  }, [rawRows.length, isProcessing, fileInputKey, previewRows]);

  useEffect(() => {
    if (rfidLookupError) {
      toast.error('Failed to look up users by RFID');
      console.error(rfidLookupError);
    }
  }, [rfidLookupError]);

  useEffect(() => {
    if (nameLookupError) {
      toast.error('Failed to look up users by name');
      console.error(nameLookupError);
    }
  }, [nameLookupError]);

  return {
    previewRows,
    isLoadingLookups,
    isProcessing,
  };
}
