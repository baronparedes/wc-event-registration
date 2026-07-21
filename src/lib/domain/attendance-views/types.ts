import type {
  AttendanceAnswerSummary,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
  RegistrationAnswerSummary,
} from '@/lib/domain/attendance';

export type DynamicFieldSource = 'registration' | 'attendance' | 'role' | 'category';

export type DynamicFieldRef = {
  source: DynamicFieldSource;
  fieldKey: string;
  label: string;
  sortOrder?: number;
  fieldType?: RegistrationAnswerSummary['field_type'] | AttendanceAnswerSummary['field_type'];
};

export type DynamicFieldFilter = {
  field: DynamicFieldRef;
  value: string;
};

export type DynamicFilterCombination = 'and' | 'or';

export type DynamicFieldOption = DynamicFieldRef & {
  token: string;
  values: string[];
};

export type AttendeeViewGroupSort =
  | 'label_asc'
  | 'label_desc'
  | 'size_desc'
  | 'size_asc'
  | 'time_asc'
  | 'time_desc';

export type GroupByFieldRef = DynamicFieldRef & {
  groupSort?: AttendeeViewGroupSort;
};

export type AttendeeViewConfig = {
  nameOrMemberQuery: string;
  role: string[];
  category: string;
  checkInStatus: AttendeeSearchResult['check_in_status'] | 'all';
  dynamicFilterCombination?: DynamicFilterCombination;
  dynamicFilters: DynamicFieldFilter[];
  groupBy: GroupByFieldRef[];
  visibleFields: DynamicFieldRef[];
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

export type AttendanceSavedView = {
  id: string;
  event_id: string;
  name: string;
  view_config: AttendeeViewConfig;
  created_at: string;
  updated_at: string;
};
