import type { AttendeeSearchResult } from '@/lib/domain/attendance';

import type { AttendeeViewConfig, BuildAttendeeViewResult } from './types';

type CsvVisibleField = AttendeeViewConfig['visibleFields'][number] & {
  source: 'registration' | 'attendance';
};

function toExportRegistrantKey(attendeeKind: 'registered' | 'public', attendeeId: string): string {
  return attendeeKind === 'public' ? `public-${attendeeId}` : `registered-${attendeeId}`;
}

function formatVisibleFieldValue(attendee: AttendeeSearchResult, field: CsvVisibleField): string {
  const answers =
    field.source === 'registration' ? attendee.registration_answers : attendee.attendance_answers;

  const answer = answers.find((item) => item.field_key === field.fieldKey);
  if (!answer) {
    return '';
  }

  if (answer.answer_text !== null && answer.answer_text.trim().length > 0) {
    return answer.answer_text;
  }

  if (answer.answer_number !== null) {
    return String(answer.answer_number);
  }

  return '';
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function getVisibleFieldsForCsv(
  visibleFields: AttendeeViewConfig['visibleFields'],
): CsvVisibleField[] {
  return visibleFields.filter(
    (field): field is CsvVisibleField =>
      field.source === 'registration' || field.source === 'attendance',
  );
}

type BuildAttendanceViewExportInput = {
  eventId: string;
  filteredAttendees: BuildAttendeeViewResult['filteredAttendees'];
  groups: BuildAttendeeViewResult['groups'];
  visibleFields: AttendeeViewConfig['visibleFields'];
  now?: Date;
};

type BuildAttendanceViewExportResult = {
  csvText: string;
  filename: string;
};

export function buildAttendanceViewCsvExport({
  eventId,
  filteredAttendees,
  groups,
  visibleFields,
  now = new Date(),
}: BuildAttendanceViewExportInput): BuildAttendanceViewExportResult {
  const attendeesByKey = new Map(
    filteredAttendees.map((attendee) => [
      toExportRegistrantKey(
        attendee.attendee_kind,
        attendee.attendee_kind === 'public'
          ? (attendee.public_registration_id ?? attendee.registration_id)
          : attendee.registration_id,
      ),
      attendee,
    ]),
  );

  const visibleFieldsForCsv = getVisibleFieldsForCsv(visibleFields);

  const header = [
    'group',
    'attendee_kind',
    'registration_id',
    'public_registration_id',
    'member_id',
    'full_name',
    'email',
    'role',
    'category',
    'check_in_status',
    'official_check_in_time',
    ...visibleFieldsForCsv.map((field) => field.label),
  ];

  const rows = groups.flatMap((group) =>
    group.registrants.map((registrant) => {
      const attendeeId =
        registrant.attendee_kind === 'public'
          ? (registrant.public_registration_id ?? '')
          : (registrant.registration_id ?? '');

      const attendee = attendeeId
        ? attendeesByKey.get(toExportRegistrantKey(registrant.attendee_kind, attendeeId))
        : undefined;

      return [
        group.label,
        registrant.attendee_kind,
        registrant.registration_id ?? '',
        registrant.public_registration_id ?? '',
        registrant.member_id ?? '',
        registrant.full_name,
        registrant.email ?? '',
        registrant.role ?? '',
        registrant.category ?? '',
        registrant.check_in_status ?? '',
        attendee?.official_check_in_time ?? '',
        ...visibleFieldsForCsv.map((field) =>
          attendee ? formatVisibleFieldValue(attendee, field) : '',
        ),
      ];
    }),
  );

  const csvText = [header, ...rows]
    .map((line) => line.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');

  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `event-${eventId}-attendance-view-${timestamp}.csv`;

  return {
    csvText,
    filename,
  };
}
