import type { AttendeeSearchResult, RegistrantAttendanceRow } from '@/lib/domain/attendance';

export type DynamicFieldSource = 'registration' | 'attendance' | 'role' | 'category';

export type DynamicFieldRef = {
  source: DynamicFieldSource;
  fieldKey: string;
  label: string;
  sortOrder?: number;
};

export type DynamicFieldFilter = {
  field: DynamicFieldRef;
  value: string;
};

export type DynamicFieldOption = DynamicFieldRef & {
  token: string;
  values: string[];
};

export type AttendeeViewConfig = {
  nameOrMemberQuery: string;
  role: string[];
  category: string;
  checkInStatus: AttendeeSearchResult['check_in_status'] | 'all';
  dynamicFilters: DynamicFieldFilter[];
  groupBy: DynamicFieldRef[];
};

export type RegistrantViewGroup = {
  key: string;
  label: string;
  registrants: RegistrantAttendanceRow[];
};

export type BuildAttendeeViewResult = {
  filteredAttendees: AttendeeSearchResult[];
  groups: RegistrantViewGroup[];
};
