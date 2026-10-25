import type { MemberCsvPreviewRow } from '@/lib/domain/members';

export function getOperationBadgeClass(
  operation: 'insert' | 'update' | 'update_member_id' | 'error',
) {
  switch (operation) {
    case 'insert':
      return 'bg-secondary/15 text-secondary';
    case 'update':
      return 'bg-primary/15 text-primary';
    case 'update_member_id':
      return 'bg-accent/20 text-amber-700';
    case 'error':
      return 'bg-danger/15 text-danger';
    default:
      return 'bg-muted/20 text-muted';
  }
}

export function getOperationLabel(operation: 'insert' | 'update' | 'update_member_id' | 'error') {
  switch (operation) {
    case 'insert':
      return 'Insert';
    case 'update':
      return 'Update';
    case 'update_member_id':
      return 'Update Member ID';
    case 'error':
      return 'Error';
    default:
      return operation;
  }
}

export function getRowSummaryNote(row: MemberCsvPreviewRow): string {
  if (row.errors.length > 0) {
    return row.errors.join(' ');
  }
  if (row.operation === 'insert') {
    return `New member (${row.role}, ${row.category})`;
  }
  if (row.operation === 'update_member_id') {
    const otherChanges = row.field_changes.filter((c) => c.field !== 'member_id');
    return `RFID change: ${row.target_member_id} → ${row.member_id}${
      otherChanges.length > 0
        ? ` (+${otherChanges.length} other field change${otherChanges.length > 1 ? 's' : ''})`
        : ''
    }`;
  }
  if (row.operation === 'update') {
    if (row.field_changes.length === 0) {
      return 'No field changes (already up to date).';
    }
    const labels = row.field_changes.map((c) => c.label);
    const summary = labels.slice(0, 2).join(', ');
    const more = labels.length > 2 ? ` +${labels.length - 2} more` : '';
    return `Updating ${row.field_changes.length} field(s): ${summary}${more}`;
  }
  return '';
}

export function extractBulkImportErrors(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return ['Import failed.'];
  }

  try {
    const parsed = JSON.parse(error.message) as {
      error?: unknown;
      detail?: unknown;
      details?: unknown;
    };

    if (Array.isArray(parsed.details)) {
      const details = parsed.details.filter((value): value is string => typeof value === 'string');
      if (details.length > 0) {
        return details;
      }
    }

    if (typeof parsed.detail === 'string' && parsed.detail.trim().length > 0) {
      return parsed.detail
        .split(/;\s+/)
        .map((message) => message.trim())
        .filter((message) => message.length > 0);
    }

    if (typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
      return [parsed.error];
    }
  } catch {
    // Fall through and use raw message.
  }

  return [error.message || 'Import failed.'];
}
