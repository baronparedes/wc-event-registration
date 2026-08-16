import { useMemo } from 'react';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import {
  type DynamicFieldOption,
  type DynamicFieldRef,
  collectDynamicFieldOptions,
} from '@/lib/domain/attendance-views';
import type { AdminEventField } from '@/lib/domain/event-fields';

type UseAttendanceDataViewOptionsParams = {
  attendees: AttendeeSearchResult[];
  attendanceFields: AttendanceField[];
  registrationFields: AdminEventField[];
};

type AttendanceDataViewOptions = {
  dynamicFieldOptions: DynamicFieldOption[];
  registrationDynamicFieldOptions: DynamicFieldOption[];
  attendanceDynamicFieldOptions: DynamicFieldOption[];
  memberDynamicFieldOptions: DynamicFieldOption[];
  roleOptions: string[];
  categoryOptions: string[];
};

const memberFieldDefinitions: DynamicFieldRef[] = [
  { source: 'member', fieldKey: 'member_id', label: 'RFID', sortOrder: 0 },
  { source: 'role', fieldKey: 'role', label: 'Role', sortOrder: 1 },
  { source: 'category', fieldKey: 'category', label: 'Category', sortOrder: 2 },
  { source: 'member', fieldKey: 'email', label: 'Email', sortOrder: 3 },
  { source: 'member', fieldKey: 'avatar', label: 'Avatar', sortOrder: 4 },
  { source: 'member', fieldKey: 'checked_in_slot', label: 'Checked In Slot', sortOrder: 5 },
  { source: 'member', fieldKey: 'check_in_status', label: 'Check-In Indicator', sortOrder: 6 },
];

function getUniqueValues(attendees: AttendeeSearchResult[], field: keyof AttendeeSearchResult) {
  return [
    ...new Set(
      attendees
        .map((attendee) => {
          const value = attendee[field];
          return typeof value === 'string' ? value.trim() : null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function useAttendanceDataViewOptions({
  attendees,
  attendanceFields,
  registrationFields,
}: UseAttendanceDataViewOptionsParams): AttendanceDataViewOptions {
  const memberDynamicFieldOptions = useMemo(
    () =>
      memberFieldDefinitions.map((field) => ({
        ...field,
        token: `${field.source}:${field.fieldKey}`,
        values:
          field.fieldKey === 'member_id'
            ? getUniqueValues(attendees, 'member_id')
            : field.fieldKey === 'role'
              ? getUniqueValues(attendees, 'role')
              : field.fieldKey === 'category'
                ? getUniqueValues(attendees, 'category')
                : field.fieldKey === 'email'
                  ? getUniqueValues(attendees, 'email')
                  : [],
      })),
    [attendees],
  );

  const seededDynamicFields = useMemo(
    () => [
      ...registrationFields
        .filter((field) => field.is_active)
        .map((field) => ({
          source: 'registration' as const,
          fieldKey: field.field_key,
          label: field.label,
          sortOrder: field.display_order,
          fieldType: field.field_type,
        })),
      ...attendanceFields.map((field) => ({
        source: 'attendance' as const,
        fieldKey: field.field_key,
        label: field.label,
        sortOrder: field.display_order,
        fieldType: field.field_type,
      })),
      ...memberDynamicFieldOptions,
    ],
    [attendanceFields, memberDynamicFieldOptions, registrationFields],
  );

  const dynamicFieldOptions = useMemo(
    () => collectDynamicFieldOptions(attendees, seededDynamicFields),
    [attendees, seededDynamicFields],
  );

  return {
    dynamicFieldOptions,
    registrationDynamicFieldOptions: dynamicFieldOptions.filter(
      (field) => field.source === 'registration',
    ),
    attendanceDynamicFieldOptions: dynamicFieldOptions.filter(
      (field) => field.source === 'attendance',
    ),
    memberDynamicFieldOptions: dynamicFieldOptions.filter(
      (field) =>
        field.source === 'member' || field.source === 'role' || field.source === 'category',
    ),
    roleOptions: getUniqueValues(attendees, 'role'),
    categoryOptions: getUniqueValues(attendees, 'category'),
  };
}
