import { HTTP_STATUS } from '@/shared/constants.ts';
import type { Json } from '@/shared/database.types.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

export const USHER_BACKROOM_TABLE = 'Usher / Backroom / IMT / VMT';
export const UNASSIGNED_TABLE = 'Unassigned';

export function mapServiceAttendanceTableNumber(tableInput: string): string {
  const trimmed = tableInput.trim();
  if (!trimmed || trimmed.toLowerCase() === 'x') {
    return UNASSIGNED_TABLE;
  }

  const parsed = Number(trimmed.replace(/^table\s*/i, '').trim());
  if (!Number.isNaN(parsed) && parsed > 100) {
    return USHER_BACKROOM_TABLE;
  }
  return trimmed;
}

export const kioskRecordSchema = z.object({
  rfid: z.string().trim().optional().default(''),
  name: z.string().trim().optional().default(''),
  role: z.string().trim().optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  time: z.string().trim().optional().default(''),
  time_slot: z.string().trim().min(1, 'time_slot is required'),
  table: z.string().trim().optional().default(''),
  override: z.union([z.number(), z.boolean()]).optional().default(0),
  manual_entry: z.union([z.number(), z.boolean()]).optional().default(0),
  is_walk_in: z.boolean().optional().default(false),
  volunteer_id: z.string().trim().optional().default(''),
  source_id: z.number().optional(),
  source_table: z.string().trim().optional(),
});

export const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  layout_id: z.string().uuid('layout_id must be a valid UUID').optional(),
  records: z.array(kioskRecordSchema).min(1, 'records must include at least one item'),
});

export type KioskRecord = z.infer<typeof kioskRecordSchema>;
export type SyncKioskAttendancePayload = z.infer<typeof requestSchema>;

interface UserLookupRow {
  id: string;
  member_id: string | null;
  full_name: string | null;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
}

export async function handleSyncKioskAttendance(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'sync-kiosk-attendance',
    method: 'POST',
    requireSync: true,
    allowServiceRole: true,
    allowMissingOrigin: true,
    schema: requestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  const { date, layout_id, records } = guard.data;
  const adminClient = guard.client;

  try {
    // 1. Resolve Layout ID (use provided or active layout)
    let effectiveLayoutId = layout_id;
    if (!effectiveLayoutId) {
      const { data: activeLayout, error: layoutError } = await adminClient
        .from('service_layouts')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (layoutError || !activeLayout) {
        return errorResponse(
          corsHeaders,
          HTTP_STATUS.badRequest,
          'No active service layout found. Specify layout_id or activate a layout.',
        );
      }
      effectiveLayoutId = activeLayout.id;
    }

    // 2. Resolve Seats for the layout
    const { data: seats, error: seatsError } = await adminClient
      .from('service_seats')
      .select('id, table_number')
      .eq('layout_id', effectiveLayoutId);

    if (seatsError) {
      console.error('[sync-kiosk-attendance] Failed to fetch layout seats', seatsError);
      return errorResponse(
        corsHeaders,
        HTTP_STATUS.internalServerError,
        'Failed to fetch service layout seats.',
      );
    }

    const tableToSeatIdMap = new Map<string, string>();
    (seats ?? []).forEach((s) => {
      tableToSeatIdMap.set(s.table_number.trim().toLowerCase(), s.id);
    });

    // 3. Resolve Users (by RFID first, then by name)
    const rfids = Array.from(new Set(records.map((r) => r.rfid).filter(Boolean)));
    const rfidToUserMap = new Map<string, UserLookupRow>();

    if (rfids.length > 0) {
      const { data: usersByRfid, error: rfidError } = await adminClient
        .from('users')
        .select('id, member_id, full_name, nickname, first_name, last_name')
        .in('member_id', rfids);

      if (!rfidError && usersByRfid) {
        usersByRfid.forEach((u) => {
          if (u.member_id) rfidToUserMap.set(u.member_id.trim(), u);
        });
      }
    }

    // Unmatched by RFID -> gather names
    const namesToLookup = new Set<string>();
    records.forEach((r) => {
      if (!r.rfid || !rfidToUserMap.has(r.rfid)) {
        if (r.name && r.name.trim()) {
          namesToLookup.add(r.name.trim());
        }
      }
    });

    const nameToUserMap = new Map<string, UserLookupRow>();
    if (namesToLookup.size > 0) {
      const orFilters: string[] = [];
      for (const name of namesToLookup) {
        const escaped = name.replace(/[,%_]/g, (char) => `\\${char}`);
        orFilters.push(`full_name.ilike.%${escaped}%`);
      }

      const { data: usersByName, error: nameError } = await adminClient
        .from('users')
        .select('id, member_id, full_name, nickname, first_name, last_name')
        .or(orFilters.join(','));

      if (!nameError && usersByName) {
        usersByName.forEach((u) => {
          const nick = (u.nickname ?? '').trim().toLowerCase();
          const last = (u.last_name ?? '').trim().toLowerCase();
          const first = (u.first_name ?? '').trim().toLowerCase();
          const full = (u.full_name ?? '').trim().toLowerCase();

          if (nick && last) nameToUserMap.set(`${nick} ${last}`, u);
          if (first && last) nameToUserMap.set(`${first} ${last}`, u);
          if (full) nameToUserMap.set(full, u);
        });
      }
    }

    // 4. Construct payload rows and collect unmatched records
    const validRows: Array<{
      user_id: string;
      rfid: string | null;
      service_date: string;
      time_slot: string;
      checked_in_at: string;
      is_walk_in: boolean;
      is_override: boolean;
      is_manual_entry: boolean;
      service_seat_id: string | null;
      metadata: Record<string, unknown>;
    }> = [];

    const unmatched: Array<{
      rfid?: string;
      name?: string;
      role?: string;
      date: string;
      time_slot: string;
      table?: string;
      source_id?: number;
      source_table?: string;
      reason: string;
    }> = [];

    for (const record of records) {
      const normalizedName = record.name.trim().toLowerCase();
      const matchedUser =
        (record.rfid ? rfidToUserMap.get(record.rfid) : undefined) ??
        (normalizedName ? nameToUserMap.get(normalizedName) : undefined);

      if (!matchedUser) {
        unmatched.push({
          rfid: record.rfid || undefined,
          name: record.name || undefined,
          role: record.role || undefined,
          date: record.date,
          time_slot: record.time_slot,
          table: record.table || undefined,
          source_id: record.source_id,
          source_table: record.source_table,
          reason: 'Member not found in system',
        });
        continue;
      }

      const effectiveTableNumber = mapServiceAttendanceTableNumber(record.table);
      const seatId = tableToSeatIdMap.get(effectiveTableNumber.toLowerCase()) ?? null;

      let checkedInAt = `${record.date}T00:00:00+08:00`;
      if (record.time) {
        checkedInAt = `${record.date}T${record.time}+08:00`;
      }

      const metadata: Record<string, unknown> = {};
      if (record.role) metadata.role = record.role;
      if (record.volunteer_id) metadata.volunteer_id = record.volunteer_id;
      if (record.name) metadata.legacy_name = record.name;
      if (record.table) metadata.original_table_number = record.table;
      if (record.source_id !== undefined) metadata.source_id = record.source_id;
      if (record.source_table) metadata.source_table = record.source_table;

      validRows.push({
        user_id: matchedUser.id,
        rfid: record.rfid || matchedUser.member_id || null,
        service_date: record.date,
        time_slot: record.time_slot,
        checked_in_at: checkedInAt,
        is_walk_in: Boolean(record.is_walk_in),
        is_override: Boolean(record.override),
        is_manual_entry: Boolean(record.manual_entry),
        service_seat_id: seatId,
        metadata,
      });
    }

    // 5. Upsert valid rows via atomic RPC
    let insertedCount = 0;
    let updatedCount = 0;

    if (validRows.length > 0) {
      const { data: rpcResult, error: rpcError } = await adminClient.rpc(
        'apply_bulk_service_attendance_upsert',
        {
          p_layout_id: effectiveLayoutId,
          p_rows: validRows as unknown as Json,
          p_admin_user_id: undefined,
        },
      );

      if (rpcError) {
        console.error('[sync-kiosk-attendance] RPC failed', rpcError);
        return errorResponse(
          corsHeaders,
          HTTP_STATUS.internalServerError,
          `Failed to upsert attendance: ${rpcError.message}`,
        );
      }

      const summary = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
      insertedCount = Number(summary?.inserted_count ?? 0);
      updatedCount = Number(summary?.updated_count ?? 0);
    }

    return successResponse(corsHeaders, {
      message: `Processed ${records.length} records (${insertedCount} inserted, ${updatedCount} updated, ${unmatched.length} unmatched).`,
      date,
      layout_id: effectiveLayoutId,
      total_received: records.length,
      valid_count: validRows.length,
      inserted_count: insertedCount,
      updated_count: updatedCount,
      unmatched,
    });
  } catch (error) {
    console.error('[sync-kiosk-attendance] Unexpected error', error);
    return errorResponse(
      corsHeaders,
      HTTP_STATUS.internalServerError,
      'Internal server error during kiosk attendance sync.',
    );
  }
}
