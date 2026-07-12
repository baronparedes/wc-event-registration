import {
  REGISTRATION_SHARE_FIELDS,
  REGISTRATION_SHARE_FIELD_LABELS,
  type RegistrationShareAnswerField,
  type RegistrationShareField,
  type RegistrationSharePayloadRow,
} from './types';

const DEFAULT_SHARE_FIELDS: RegistrationShareField[] = ['full_name'];
const SHARE_DATE_TIME_FIELDS = new Set<RegistrationShareField>(['submitted_at', 'updated_at']);

function formatShareDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function formatRegistrationStatus(value: string): string {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function compareRowsByFullName(
  leftRow: RegistrationSharePayloadRow,
  rightRow: RegistrationSharePayloadRow,
): number {
  const leftName = leftRow.full_name.trim();
  const rightName = rightRow.full_name.trim();

  return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });
}

function normalizeSelectedFields(fields: RegistrationShareField[]): RegistrationShareField[] {
  const selectedSet = new Set(fields);
  const normalized = REGISTRATION_SHARE_FIELDS.filter((field) => selectedSet.has(field));
  return normalized.length > 0 ? normalized : DEFAULT_SHARE_FIELDS;
}

export function formatRegistrationShareFieldValue(
  field: RegistrationShareField,
  rawValue: string | null | undefined,
): string {
  const trimmedValue = (rawValue ?? '').trim();
  if (!trimmedValue) return '';

  if (field === 'registration_status') {
    return formatRegistrationStatus(trimmedValue);
  }

  if (SHARE_DATE_TIME_FIELDS.has(field)) {
    return formatShareDateTime(trimmedValue);
  }

  return trimmedValue;
}

export interface FormatRegistrationShareTextParams {
  rows: RegistrationSharePayloadRow[];
  selectedFields: RegistrationShareField[];
  selectedAnswerFieldIds?: string[];
  answerFields?: RegistrationShareAnswerField[];
  eventTitle?: string;
  includeHeader?: boolean;
}

/**
 * Formats registration rows into share-friendly plain text.
 * The output is deterministic so admins can post directly into social/group chats.
 */
export function formatRegistrationShareText({
  rows,
  selectedFields,
  selectedAnswerFieldIds = [],
  answerFields = [],
  eventTitle,
  includeHeader = true,
}: FormatRegistrationShareTextParams): string {
  const normalizedFields = normalizeSelectedFields(selectedFields);
  const answerFieldMap = new Map(answerFields.map((field) => [field.field_id, field.label]));
  const sortedRows = [...rows].sort(compareRowsByFullName);
  const lines: string[] = [];

  if (includeHeader) {
    const title = eventTitle?.trim() ? eventTitle.trim() : 'Event';
    lines.push(`Registered attendees for ${title} (${rows.length})`);
    lines.push('');
  }

  sortedRows.forEach((row, index) => {
    const staticSegments = normalizedFields
      .map((field): string => {
        const fieldValue = formatRegistrationShareFieldValue(field, row[field]);
        if (!fieldValue) return '';
        if (field === 'full_name') return fieldValue;
        return `${REGISTRATION_SHARE_FIELD_LABELS[field]}: ${fieldValue}`;
      })
      .filter((entry) => entry.length > 0);

    const answerSegments = selectedAnswerFieldIds
      .map((fieldId): string => {
        const answerValue = row.answer_values[fieldId]?.trim() ?? '';
        if (!answerValue) return '';
        const label = answerFieldMap.get(fieldId) ?? 'Answer';
        return `${label}: ${answerValue}`;
      })
      .filter((entry) => entry.length > 0);

    const value = [...staticSegments, ...answerSegments].join(' | ');

    lines.push(`${index + 1}. ${value}`);
  });

  return lines.join('\n');
}
