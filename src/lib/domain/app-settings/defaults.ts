import type {
  AppSettingsMap,
  AttendanceScoringWeightsSetting,
  ForecastConfidenceThresholdsSetting,
  LongLeavePolicySetting,
  PublicAppSettingsMap,
  ServiceStaffingTargetsSetting,
  ServiceTimeSlotSetting,
  VolunteerRoleSetting,
  WeeklyDebriefConfigSetting,
} from './schemas';

export const DEFAULT_SERVICE_STAFFING_TARGETS: ServiceStaffingTargetsSetting = {
  '9AM': {
    Usher: 17,
    'Backroom Support': 11,
    'Prayer Coach': 50,
    'IMT Support': 4,
    'VMT Support': 2,
  },
  '12NN': {
    Usher: 15,
    'Backroom Support': 11,
    'Prayer Coach': 40,
    'IMT Support': 4,
    'VMT Support': 2,
  },
  '3PM': {
    Usher: 19,
    'Backroom Support': 13,
    'Prayer Coach': 60,
    'IMT Support': 4,
    'VMT Support': 2,
  },
};

export const DEFAULT_FORECAST_CONFIDENCE_THRESHOLDS: ForecastConfidenceThresholdsSetting = {
  solid: 0.7,
  moderate: 0.4,
  default_turnup_rate: 0.8,
};

export const DEFAULT_ATTENDANCE_SCORING_WEIGHTS: AttendanceScoringWeightsSetting = {
  attended: 1.0,
  absence: -1.0,
  excused: -0.5,
  walk_in_9am_3pm: 0.5,
  walk_in_5th_sunday: 1.0,
};

export const DEFAULT_LONG_LEAVE_POLICY: LongLeavePolicySetting = {
  min_days: 28,
  min_weeks: 4,
  require_sunday_dates: true,
};

export const DEFAULT_SERVICE_TIME_SLOTS: ServiceTimeSlotSetting[] = [
  { key: '9AM', label: '9:00 AM', sort_order: 1, is_active: true },
  { key: '12NN', label: '12:00 NN', sort_order: 2, is_active: true },
  { key: '3PM', label: '3:00 PM', sort_order: 3, is_active: true },
];

export const DEFAULT_VOLUNTEER_ROLES: VolunteerRoleSetting[] = [
  {
    key: 'Usher',
    label: 'Usher',
    sort_order: 1,
    is_active: true,
    is_recruitment_enabled: true,
    is_staffing_target: true,
  },
  {
    key: 'Backroom Support',
    label: 'Backroom Support',
    sort_order: 2,
    is_active: true,
    is_recruitment_enabled: false,
    is_staffing_target: true,
  },
  {
    key: 'Prayer Coach',
    label: 'Prayer Coach',
    sort_order: 3,
    is_active: true,
    is_recruitment_enabled: true,
    is_staffing_target: true,
  },
  {
    key: 'IMT Support',
    label: 'IMT Support',
    sort_order: 4,
    is_active: true,
    is_recruitment_enabled: true,
    is_staffing_target: true,
  },
  {
    key: 'VMT Support',
    label: 'VMT Support',
    sort_order: 5,
    is_active: true,
    is_recruitment_enabled: true,
    is_staffing_target: true,
  },
  {
    key: 'OIC',
    label: 'OIC',
    sort_order: 6,
    is_active: true,
    is_recruitment_enabled: false,
    is_staffing_target: false,
  },
];

export const DEFAULT_WEEKLY_DEBRIEF_CONFIG: WeeklyDebriefConfigSetting = {
  recipient_roles: ['OIC'],
};

export const DEFAULT_APP_SETTINGS: AppSettingsMap = {
  service_staffing_targets: DEFAULT_SERVICE_STAFFING_TARGETS,
  forecast_confidence_thresholds: DEFAULT_FORECAST_CONFIDENCE_THRESHOLDS,
  attendance_scoring_weights: DEFAULT_ATTENDANCE_SCORING_WEIGHTS,
  long_leave_policy: DEFAULT_LONG_LEAVE_POLICY,
  service_time_slots: DEFAULT_SERVICE_TIME_SLOTS,
  volunteer_roles: DEFAULT_VOLUNTEER_ROLES,
  weekly_debrief_config: DEFAULT_WEEKLY_DEBRIEF_CONFIG,
};

export const DEFAULT_PUBLIC_APP_SETTINGS: PublicAppSettingsMap = {
  long_leave_policy: DEFAULT_LONG_LEAVE_POLICY,
  service_time_slots: DEFAULT_SERVICE_TIME_SLOTS,
  volunteer_roles: DEFAULT_VOLUNTEER_ROLES,
};
