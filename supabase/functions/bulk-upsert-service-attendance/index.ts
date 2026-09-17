import { HTTP_STATUS, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { logAdminAction } from '@/shared/security.ts';
import { z } from '@/shared/validation.ts';

const bulkRowSchema = z.object({
  user_id: z.string().uuid('user_id must be a valid UUID'),
  rfid: z.string().nullable().optional(),
  service_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'service_date must be in YYYY-MM-DD format'),
  time_slot: z.string().trim().min(1, 'time_slot is required'),
  checked_in_at: z.string().optional(),
  is_walk_in: z.boolean().optional().default(false),
  is_override: z.boolean().optional().default(false),
  is_manual_entry: z.boolean().optional().default(false),
  service_seat_id: z.string().uuid('service_seat_id must be a valid UUID').nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const requestSchema = z.object({
  layout_id: z.string().uuid('layout_id must be a valid UUID'),
  rows: z.array(bulkRowSchema).min(1, 'rows must include at least one item'),
});

type RequestPayload = z.infer<typeof requestSchema>;

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'bulk-upsert-service-attendance',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'bulk-upsert-service-attendance',
      windowMs: RATE_LIMIT_PRESETS.bulkUpsertServiceAttendance.windowMs,
      maxHits: RATE_LIMIT_PRESETS.bulkUpsertServiceAttendance.maxHits,
    },
    schema: requestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  const { layout_id, rows }: RequestPayload = guard.data;
  const adminClient = guard.client;

  try {
    // 1. Call atomic database RPC function
    const { data: rpcResult, error: rpcError } = await adminClient.rpc(
      'apply_bulk_service_attendance_upsert',
      {
        p_layout_id: layout_id,
        p_rows: rows,
        p_admin_user_id: guard.userId ?? null,
      },
    );

    if (rpcError) {
      console.error('[bulk-upsert-service-attendance] RPC failed', rpcError);
      return errorResponse(
        corsHeaders,
        HTTP_STATUS.internalServerError,
        `Failed to apply service attendance migration: ${rpcError.message}`,
      );
    }

    const summary = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    const insertedCount = Number(summary?.inserted_count ?? 0);
    const updatedCount = Number(summary?.updated_count ?? 0);
    const totalCount = Number(summary?.total_count ?? insertedCount + updatedCount);

    // 2. Audit log
    if (guard.userId) {
      await logAdminAction({
        adminClient,
        adminUserId: guard.userId,
        action: 'bulk_upsert_service_attendance',
        resourceType: 'service_attendance',
        resourceId: layout_id,
        metadata: {
          total_received: rows.length,
          inserted_count: insertedCount,
          updated_count: updatedCount,
          total_migrated: totalCount,
        },
      });
    }

    return successResponse(
      corsHeaders,
      {
        message: `Successfully migrated ${totalCount} attendance record${totalCount === 1 ? '' : 's'}.`,
        insertedCount,
        updatedCount,
        totalCount,
      },
      HTTP_STATUS.ok,
    );
  } catch (error) {
    console.error('[bulk-upsert-service-attendance] unexpected error', error);
    return errorResponse(
      corsHeaders,
      HTTP_STATUS.internalServerError,
      error instanceof Error ? error.message : 'An unexpected error occurred during migration',
    );
  }
});
