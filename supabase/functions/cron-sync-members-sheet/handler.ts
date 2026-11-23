import { HTTP_STATUS, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import type { Json } from '@/shared/database.types.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';

import { type GoogleSheetsConfig, fetchSheetValues } from './googleSheets.ts';
import { type ExistingMember, parseSheetRows, resolveSyncRows } from './logic.ts';

const MAX_REPORTED_ERRORS = 50;

function readGoogleSheetsConfig():
  | { ok: true; config: GoogleSheetsConfig }
  | { ok: false; message: string; missing?: string[] } {
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')?.trim() ?? '';
  const privateKeyPem = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.trim() ?? '';
  const spreadsheetId = Deno.env.get('GOOGLE_SHEETS_SPREADSHEET_ID')?.trim() ?? '';
  const rawSheetGid = Deno.env.get('GOOGLE_SHEETS_GID')?.trim() ?? '';

  const missing: string[] = [];
  if (!serviceAccountEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!privateKeyPem) missing.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  if (!spreadsheetId) missing.push('GOOGLE_SHEETS_SPREADSHEET_ID');

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Google Sheets sync is not configured (missing: ${missing.join(', ')})`,
      missing,
    };
  }

  let sheetGid: number | undefined;
  if (rawSheetGid.length > 0) {
    if (!/^\d+$/.test(rawSheetGid)) {
      return {
        ok: false,
        message: 'GOOGLE_SHEETS_GID must be a non-negative integer.',
      };
    }
    sheetGid = Number.parseInt(rawSheetGid, 10);
  }

  return {
    ok: true,
    config: {
      serviceAccountEmail,
      privateKeyPem,
      spreadsheetId,
      sheetGid,
    },
  };
}

export async function handleCronSyncMembersSheet(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'cron-sync-members-sheet',
    allowMissingOrigin: true,
    method: 'POST',
    requireAdmin: true,
    allowCronRole: true,
    allowServiceRole: true,
    requiredPermission: 'canWriteAdminData',
    rateLimit: {
      scope: 'cron-sync-members-sheet',
      windowMs: RATE_LIMIT_PRESETS.cron.syncMembersSheet.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cron.syncMembersSheet.maxHits,
    },
  });

  if (!guard.valid) {
    return guard.response;
  }

  const configResult = readGoogleSheetsConfig();
  if (!configResult.ok) {
    console.error('[cron-sync-members-sheet] Invalid or missing Google Sheets configuration', {
      requestId: guard.requestId,
      missing: configResult.missing,
      message: configResult.message,
    });
    return errorResponse(guard.corsHeaders, HTTP_STATUS.internalServerError, configResult.message);
  }

  try {
    console.log('[cron-sync-members-sheet] Starting Google Sheet member sync', {
      requestId: guard.requestId,
      callerType: guard.callerType,
      sheetGid: configResult.config.sheetGid ?? 'first-tab',
    });

    const sheetValues = await fetchSheetValues(configResult.config);
    const { parsedRows, skipped: parseSkipped, totalDataRows } = parseSheetRows(sheetValues);

    if (totalDataRows === 0) {
      console.log('[cron-sync-members-sheet] Sheet contains no data rows; skipping upsert', {
        requestId: guard.requestId,
      });
      return successResponse(
        guard.corsHeaders,
        {
          inserted_count: 0,
          updated_count: 0,
          skipped_count: 0,
          total_sheet_rows: 0,
          errors: [],
          timestamp: new Date().toISOString(),
        },
        HTTP_STATUS.ok,
      );
    }

    const { data: existingMembers, error: membersError } = await guard.client
      .from('users')
      .select('id, member_id, first_name, last_name, nickname, email');

    if (membersError) {
      console.error('[cron-sync-members-sheet] Failed to load existing members', {
        requestId: guard.requestId,
        error: membersError.message,
      });
      return errorResponse(
        guard.corsHeaders,
        HTTP_STATUS.internalServerError,
        'Failed to load existing members',
      );
    }

    const { resolvedRows, skipped: resolveSkipped } = resolveSyncRows(
      parsedRows,
      (existingMembers ?? []) as ExistingMember[],
    );

    const allSkipped = [...parseSkipped, ...resolveSkipped];
    let insertedCount = 0;
    let updatedCount = 0;

    if (resolvedRows.length > 0) {
      const { data: upsertResult, error: upsertError } = await guard.client.rpc(
        'apply_bulk_member_upsert',
        {
          p_rows: resolvedRows as unknown as Json,
        },
      );

      if (upsertError) {
        console.error('[cron-sync-members-sheet] apply_bulk_member_upsert RPC failed', {
          requestId: guard.requestId,
          error: upsertError.message,
        });
        return errorResponse(
          guard.corsHeaders,
          HTTP_STATUS.internalServerError,
          'Failed to apply member sync',
        );
      }

      const summary = Array.isArray(upsertResult) ? upsertResult[0] : upsertResult;
      insertedCount = Number(summary?.inserted_count ?? 0);
      updatedCount = Number(summary?.updated_count ?? 0);
    }

    const formattedErrors = allSkipped
      .slice(0, MAX_REPORTED_ERRORS)
      .map(
        (entry) =>
          `Row ${entry.row_number}${entry.member_id ? ` (${entry.member_id})` : ''}: ${entry.reasons.join(' ')}`,
      );

    console.log('[cron-sync-members-sheet] Google Sheet member sync completed', {
      requestId: guard.requestId,
      totalSheetRows: totalDataRows,
      insertedCount,
      updatedCount,
      skippedCount: allSkipped.length,
      errorSample: formattedErrors.slice(0, 10),
    });

    return successResponse(
      guard.corsHeaders,
      {
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_count: allSkipped.length,
        total_sheet_rows: totalDataRows,
        errors: formattedErrors,
        timestamp: new Date().toISOString(),
      },
      HTTP_STATUS.ok,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron-sync-members-sheet] Unexpected error during sync', {
      requestId: guard.requestId,
      error: errorMessage,
    });
    return errorResponse(
      guard.corsHeaders,
      HTTP_STATUS.internalServerError,
      'Failed to sync members from Google Sheet',
    );
  }
}
