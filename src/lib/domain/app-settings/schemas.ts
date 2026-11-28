import { z } from 'zod';

export const APP_SETTING_KEYS = [
  'service_staffing_targets',
  'forecast_confidence_thresholds',
  'attendance_scoring_weights',
  'long_leave_policy',
  'service_time_slots',
  'volunteer_roles',
  'weekly_debrief_config',
  'recruitment',
] as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

export type EditableSystemSettingKey = Exclude<AppSettingKey, 'recruitment'>;

export const serviceStaffingTargetsSchema = z.record(
  z.string().trim().min(1),
  z.record(z.string().trim().min(1), z.number().int().min(0)),
);

export const forecastConfidenceThresholdsSchema = z
  .object({
    solid: z.number().min(0.1).max(1),
    moderate: z.number().min(0).max(1),
    default_turnup_rate: z.number().min(0).max(1),
  })
  .refine((value) => value.solid >= value.moderate, {
    message: 'Solid threshold must be greater than or equal to moderate threshold',
    path: ['solid'],
  });

export const attendanceScoringWeightsSchema = z.object({
  attended: z.number().finite(),
  absence: z.number().finite(),
  excused: z.number().finite(),
  walk_in_9am_3pm: z.number().finite(),
  walk_in_5th_sunday: z.number().finite(),
});

export const longLeavePolicySchema = z.object({
  min_days: z.number().int().min(7).max(365),
  min_weeks: z.number().int().min(1).max(52),
  require_sunday_dates: z.boolean(),
});

export const serviceTimeSlotSettingSchema = z.object({
  key: z.string().trim().min(1, 'Slot key is required').max(32),
  label: z.string().trim().min(1, 'Display label is required').max(64),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
});

export const serviceTimeSlotsSettingSchema = z
  .array(serviceTimeSlotSettingSchema)
  .min(1, 'At least one service time slot is required')
  .refine((items) => items.some((item) => item.is_active), {
    message: 'At least one service time slot must be active',
  })
  .refine((items) => new Set(items.map((item) => item.key)).size === items.length, {
    message: 'Service time slot keys must be unique',
  });

export const volunteerRoleSettingSchema = z.object({
  key: z.string().trim().min(1, 'Role key is required').max(64),
  label: z.string().trim().min(1, 'Display label is required').max(64),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  is_recruitment_enabled: z.boolean(),
  is_staffing_target: z.boolean(),
});

export const volunteerRolesSettingSchema = z
  .array(volunteerRoleSettingSchema)
  .min(1, 'At least one volunteer role is required')
  .refine((items) => items.some((item) => item.is_active), {
    message: 'At least one volunteer role must be active',
  })
  .refine((items) => new Set(items.map((item) => item.key)).size === items.length, {
    message: 'Volunteer role keys must be unique',
  });

export const weeklyDebriefConfigSchema = z.object({
  recipient_roles: z
    .array(z.string().trim().min(1))
    .min(1, 'At least one debrief recipient role is required'),
});

export type ServiceStaffingTargetsSetting = z.infer<typeof serviceStaffingTargetsSchema>;
export type ForecastConfidenceThresholdsSetting = z.infer<
  typeof forecastConfidenceThresholdsSchema
>;
export type AttendanceScoringWeightsSetting = z.infer<typeof attendanceScoringWeightsSchema>;
export type LongLeavePolicySetting = z.infer<typeof longLeavePolicySchema>;
export type ServiceTimeSlotSetting = z.infer<typeof serviceTimeSlotSettingSchema>;
export type VolunteerRoleSetting = z.infer<typeof volunteerRoleSettingSchema>;
export type WeeklyDebriefConfigSetting = z.infer<typeof weeklyDebriefConfigSchema>;

export interface AppSettingsMap {
  service_staffing_targets: ServiceStaffingTargetsSetting;
  forecast_confidence_thresholds: ForecastConfidenceThresholdsSetting;
  attendance_scoring_weights: AttendanceScoringWeightsSetting;
  long_leave_policy: LongLeavePolicySetting;
  service_time_slots: ServiceTimeSlotSetting[];
  volunteer_roles: VolunteerRoleSetting[];
  weekly_debrief_config: WeeklyDebriefConfigSetting;
}

export interface PublicAppSettingsMap {
  long_leave_policy: LongLeavePolicySetting;
  service_time_slots: ServiceTimeSlotSetting[];
  volunteer_roles: VolunteerRoleSetting[];
}

export type UpdateAppSettingPayload<K extends EditableSystemSettingKey = EditableSystemSettingKey> =
  {
    key: K;
    value: AppSettingsMap[K];
  };
