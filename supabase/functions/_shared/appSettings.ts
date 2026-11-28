import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from './database.types.ts';
import { z } from './validation.ts';

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

export const serviceTimeSlotItemSchema = z.object({
  key: z.string().trim().min(1).max(32),
  label: z.string().trim().min(1).max(64),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
});

export const serviceTimeSlotsSchema = z
  .array(serviceTimeSlotItemSchema)
  .min(1, 'At least one service time slot is required')
  .refine((items) => items.some((item) => item.is_active), {
    message: 'At least one service time slot must be active',
  })
  .refine((items) => new Set(items.map((item) => item.key)).size === items.length, {
    message: 'Service time slot keys must be unique',
  });

export const volunteerRoleItemSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(64),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  is_recruitment_enabled: z.boolean(),
  is_staffing_target: z.boolean(),
});

export const volunteerRolesSchema = z
  .array(volunteerRoleItemSchema)
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
export type ServiceTimeSlotSettingItem = z.infer<typeof serviceTimeSlotItemSchema>;
export type VolunteerRoleSettingItem = z.infer<typeof volunteerRoleItemSchema>;
export type WeeklyDebriefConfigSetting = z.infer<typeof weeklyDebriefConfigSchema>;

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

export const DEFAULT_SERVICE_TIME_SLOTS: ServiceTimeSlotSettingItem[] = [
  { key: '9AM', label: '9:00 AM', sort_order: 1, is_active: true },
  { key: '12NN', label: '12:00 NN', sort_order: 2, is_active: true },
  { key: '3PM', label: '3:00 PM', sort_order: 3, is_active: true },
];

export const DEFAULT_VOLUNTEER_ROLES: VolunteerRoleSettingItem[] = [
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

export async function getAppSettingValue<T>(
  supabase: SupabaseClient<Database>,
  key: AppSettingKey,
  schema: z.ZodType<T>,
  fallback: T,
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    const parsed = schema.safeParse(data.value);
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export async function getRawAppSetting(
  supabase: SupabaseClient<Database>,
  key: AppSettingKey,
): Promise<{ value: Json; updated_at: string } | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value, updated_at')
    .eq('key', key)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { value: data.value, updated_at: data.updated_at };
}
