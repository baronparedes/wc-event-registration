import {
  REGISTRATION_SHARE_FIELDS,
  REGISTRATION_SHARE_FIELD_LABELS,
  type RegistrationShareAnswerField,
  type RegistrationShareField,
  type RegistrationSharePayloadRow,
} from './types';

const DEFAULT_SHARE_FIELDS: RegistrationShareField[] = ['full_name'];

function normalizeSelectedFields(fields: RegistrationShareField[]): RegistrationShareField[] {
  const selectedSet = new Set(fields);
  const normalized = REGISTRATION_SHARE_FIELDS.filter((field) => selectedSet.has(field));
  return normalized.length > 0 ? normalized : DEFAULT_SHARE_FIELDS;
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
  const lines: string[] = [];

  if (includeHeader) {
    const title = eventTitle?.trim() ? eventTitle.trim() : 'Event';
    lines.push(`Registered attendees for ${title} (${rows.length})`);
    lines.push('');
  }

  rows.forEach((row, index) => {
    const staticSegments = normalizedFields
      .map((field): string => {
        const fieldValue = row[field].trim();
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
