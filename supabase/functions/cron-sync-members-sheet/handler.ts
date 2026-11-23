import { HTTP_STATUS, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import type { Json } from '@/shared/database.types.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';

import { type GoogleSheetsConfig, fetchSheetValues } from './googleSheets.ts';
import {
  type ExistingMember,
  type SkippedSyncRow,
  type SyncPreviewRow,
  type SyncPreviewSummary,
  buildSyncPreview,
  parseSheetRows,
  resolveSyncRows,
} from './logic.ts';

const MAX_REPORTED_ERRORS = 50;
export const UPSERT_BATCH_SIZE = 100;

export type SyncMembersStage =
  | 'fetching_sheet'
  | 'parsing_rows'
  | 'loading_members'
  | 'resolving_rows'
  | 'upserting_batches';

export interface SyncMembersProgressEvent {
  type: 'progress';
  stage: SyncMembersStage;
  message: string;
  percent: number;
  total_sheet_rows?: number;
  parsed_rows?: number;
  resolved_rows?: number;
  processed_rows?: number;
  total_batches?: number;
  current_batch?: number;
  inserted_count?: number;
  updated_count?: number;
  skipped_count?: number;
}

export interface SyncMembersResultPayload {
  dry_run?: false;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  total_sheet_rows: number;
  errors: string[];
  skipped_rows: SkippedSyncRow[];
  timestamp: string;
}

export interface SyncMembersPreviewPayload {
  dry_run: true;
  total_sheet_rows: number;
  skipped_count: number;
  summary: SyncPreviewSummary;
  preview_rows: SyncPreviewRow[];
  errors: string[];
  skipped_rows: SkippedSyncRow[];
  timestamp: string;
}

export interface SyncMembersCompleteEvent {
  type: 'complete';
  result: SyncMembersResultPayload | SyncMembersPreviewPayload;
}

export interface SyncMembersErrorEvent {
  type: 'error';
  message: string;
}

export type SyncMembersStreamEvent =
  | SyncMembersProgressEvent
  | SyncMembersCompleteEvent
  | SyncMembersErrorEvent;

class SyncOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncOperationError';
  }
}

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

async function parseRequestOptions(req: Request): Promise<{ stream: boolean; dryRun: boolean }> {
  const acceptHeader = req.headers.get('accept')?.toLowerCase() ?? '';
  let stream = acceptHeader.includes('application/x-ndjson');
  let dryRun = false;

  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('application/json')) {
    try {
      const rawBody = await req.clone().text();
      if (rawBody.trim()) {
        const parsed = JSON.parse(rawBody) as { stream?: unknown; dry_run?: unknown };
        if (parsed?.stream === true) stream = true;
        if (parsed?.dry_run === true) dryRun = true;
      }
    } catch {
      // Ignore malformed/empty optional body
    }
  }

  return { stream, dryRun };
}

function formatSkippedRowMessage(entry: SkippedSyncRow): string {
  return `Row ${entry.row_number}${entry.member_id ? ` (${entry.member_id})` : ''}: ${entry.reasons.join(' ')}`;
}

async function runMembersSheetSync(params: {
  client: Extract<Awaited<ReturnType<typeof useEdgeHook>>, { valid: true }>['client'];
  config: GoogleSheetsConfig;
  requestId: string;
  callerType: string | null;
  dryRun?: boolean;
  batchSize?: number;
  onProgress?: (event: SyncMembersProgressEvent) => void;
}): Promise<SyncMembersResultPayload | SyncMembersPreviewPayload> {
  const {
    client,
    config,
    requestId,
    callerType,
    dryRun = false,
    batchSize = UPSERT_BATCH_SIZE,
    onProgress,
  } = params;

  console.log('[cron-sync-members-sheet] Starting Google Sheet member sync', {
    requestId,
    callerType,
    dryRun,
    sheetGid: config.sheetGid ?? 'first-tab',
  });

  onProgress?.({
    type: 'progress',
    stage: 'fetching_sheet',
    message: 'Fetching member data from Google Sheets...',
    percent: dryRun ? 15 : 10,
  });

  const sheetValues = await fetchSheetValues(config);

  onProgress?.({
    type: 'progress',
    stage: 'parsing_rows',
    message: 'Parsing and validating sheet rows...',
    percent: dryRun ? 40 : 25,
  });

  const { parsedRows, skipped: parseSkipped, totalDataRows } = parseSheetRows(sheetValues);

  if (totalDataRows === 0) {
    console.log('[cron-sync-members-sheet] Sheet contains no data rows; skipping upsert', {
      requestId,
      dryRun,
    });
    if (dryRun) {
      return {
        dry_run: true,
        total_sheet_rows: 0,
        skipped_count: 0,
        summary: {
          total_rows: 0,
          insert_count: 0,
          update_count: 0,
          update_member_id_count: 0,
          unchanged_count: 0,
          error_count: 0,
        },
        preview_rows: [],
        errors: [],
        skipped_rows: [],
        timestamp: new Date().toISOString(),
      };
    }

    return {
      inserted_count: 0,
      updated_count: 0,
      skipped_count: 0,
      total_sheet_rows: 0,
      errors: [],
      skipped_rows: [],
      timestamp: new Date().toISOString(),
    };
  }

  onProgress?.({
    type: 'progress',
    stage: 'loading_members',
    message: `Loaded ${totalDataRows} sheet rows. Fetching existing members...`,
    percent: dryRun ? 65 : 40,
    total_sheet_rows: totalDataRows,
    parsed_rows: parsedRows.length,
    skipped_count: parseSkipped.length,
  });

  const selectColumns = dryRun
    ? 'id, member_id, first_name, last_name, nickname, email, phone, date_of_birth, role, category, metadata'
    : 'id, member_id, first_name, last_name, nickname, email';

  const { data: existingMembers, error: membersError } = await client
    .from('users')
    .select(selectColumns);

  if (membersError) {
    console.error('[cron-sync-members-sheet] Failed to load existing members', {
      requestId,
      error: membersError.message,
    });
    throw new SyncOperationError('Failed to load existing members');
  }

  onProgress?.({
    type: 'progress',
    stage: 'resolving_rows',
    message: dryRun
      ? `Comparing ${parsedRows.length} valid rows against existing members...`
      : `Matching ${parsedRows.length} valid rows against existing members...`,
    percent: dryRun ? 90 : 55,
    total_sheet_rows: totalDataRows,
    parsed_rows: parsedRows.length,
    skipped_count: parseSkipped.length,
  });

  const typedExistingMembers = (existingMembers ?? []) as unknown as ExistingMember[];
  const { resolvedRows, skipped: resolveSkipped } = resolveSyncRows(
    parsedRows,
    typedExistingMembers,
  );

  const allSkipped = [...parseSkipped, ...resolveSkipped];
  const formattedErrors = allSkipped.slice(0, MAX_REPORTED_ERRORS).map(formatSkippedRowMessage);

  if (dryRun) {
    const preview = buildSyncPreview({
      parsedRows,
      parseSkipped,
      existingMembers: typedExistingMembers,
      resolvedRows,
      resolveSkipped,
    });

    console.log('[cron-sync-members-sheet] Google Sheet member preview completed', {
      requestId,
      totalSheetRows: totalDataRows,
      summary: preview.summary,
    });

    return {
      dry_run: true,
      total_sheet_rows: totalDataRows,
      skipped_count: allSkipped.length,
      summary: preview.summary,
      preview_rows: preview.rows,
      errors: formattedErrors,
      skipped_rows: allSkipped,
      timestamp: new Date().toISOString(),
    };
  }

  let insertedCount = 0;
  let updatedCount = 0;

  if (resolvedRows.length > 0) {
    const totalBatches = Math.ceil(resolvedRows.length / batchSize);
    let processedRows = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
      const batchNumber = batchIndex + 1;
      const start = batchIndex * batchSize;
      const batchRows = resolvedRows.slice(start, start + batchSize);
      const batchPercent = Math.min(95, 55 + Math.round((batchIndex / totalBatches) * 40));

      onProgress?.({
        type: 'progress',
        stage: 'upserting_batches',
        message: `Upserting members (batch ${batchNumber} of ${totalBatches})...`,
        percent: batchPercent,
        total_sheet_rows: totalDataRows,
        parsed_rows: parsedRows.length,
        resolved_rows: resolvedRows.length,
        processed_rows: processedRows,
        total_batches: totalBatches,
        current_batch: batchNumber,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_count: allSkipped.length,
      });

      const { data: upsertResult, error: upsertError } = await client.rpc(
        'apply_bulk_member_upsert',
        {
          p_rows: batchRows as unknown as Json,
        },
      );

      if (upsertError) {
        console.error('[cron-sync-members-sheet] apply_bulk_member_upsert RPC failed', {
          requestId,
          batchNumber,
          totalBatches,
          error: upsertError.message,
        });
        throw new SyncOperationError('Failed to apply member sync');
      }

      const summary = Array.isArray(upsertResult) ? upsertResult[0] : upsertResult;
      insertedCount += Number(summary?.inserted_count ?? 0);
      updatedCount += Number(summary?.updated_count ?? 0);
      processedRows += batchRows.length;

      const completedPercent = Math.min(98, 55 + Math.round((batchNumber / totalBatches) * 43));
      onProgress?.({
        type: 'progress',
        stage: 'upserting_batches',
        message: `Processed ${processedRows} of ${resolvedRows.length} members...`,
        percent: completedPercent,
        total_sheet_rows: totalDataRows,
        parsed_rows: parsedRows.length,
        resolved_rows: resolvedRows.length,
        processed_rows: processedRows,
        total_batches: totalBatches,
        current_batch: batchNumber,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        skipped_count: allSkipped.length,
      });
    }
  }

  console.log('[cron-sync-members-sheet] Google Sheet member sync completed', {
    requestId,
    totalSheetRows: totalDataRows,
    insertedCount,
    updatedCount,
    skippedCount: allSkipped.length,
    errorSample: formattedErrors.slice(0, 10),
  });

  return {
    inserted_count: insertedCount,
    updated_count: updatedCount,
    skipped_count: allSkipped.length,
    total_sheet_rows: totalDataRows,
    errors: formattedErrors,
    skipped_rows: allSkipped,
    timestamp: new Date().toISOString(),
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

  const { stream: streamMode, dryRun } = await parseRequestOptions(req);

  if (streamMode) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: SyncMembersStreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          const result = await runMembersSheetSync({
            client: guard.client,
            config: configResult.config,
            requestId: guard.requestId,
            callerType: guard.callerType,
            dryRun,
            onProgress: emit,
          });
          emit({ type: 'complete', result });
        } catch (error) {
          const errorMessage =
            error instanceof SyncOperationError
              ? error.message
              : 'Failed to sync members from Google Sheet';
          console.error('[cron-sync-members-sheet] Error during streamed sync', {
            requestId: guard.requestId,
            dryRun,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          emit({ type: 'error', message: errorMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: HTTP_STATUS.ok,
      headers: {
        ...guard.corsHeaders,
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  try {
    const result = await runMembersSheetSync({
      client: guard.client,
      config: configResult.config,
      requestId: guard.requestId,
      callerType: guard.callerType,
      dryRun,
    });

    if (result.dry_run) {
      return successResponse(guard.corsHeaders, { ...result }, HTTP_STATUS.ok);
    }

    return successResponse(
      guard.corsHeaders,
      {
        inserted_count: result.inserted_count,
        updated_count: result.updated_count,
        skipped_count: result.skipped_count,
        total_sheet_rows: result.total_sheet_rows,
        errors: result.errors,
        timestamp: result.timestamp,
      },
      HTTP_STATUS.ok,
    );
  } catch (error) {
    if (error instanceof SyncOperationError) {
      return errorResponse(guard.corsHeaders, HTTP_STATUS.internalServerError, error.message);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron-sync-members-sheet] Unexpected error during sync', {
      requestId: guard.requestId,
      dryRun,
      error: errorMessage,
    });
    return errorResponse(
      guard.corsHeaders,
      HTTP_STATUS.internalServerError,
      'Failed to sync members from Google Sheet',
    );
  }
}
