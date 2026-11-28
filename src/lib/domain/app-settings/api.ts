import { createEdgeFunctionCaller, supabase } from '@/lib/infrastructure';

import { DEFAULT_APP_SETTINGS, DEFAULT_PUBLIC_APP_SETTINGS } from './defaults';
import {
  type AppSettingsMap,
  type EditableSystemSettingKey,
  type PublicAppSettingsMap,
  type UpdateAppSettingPayload,
  attendanceScoringWeightsSchema,
  forecastConfidenceThresholdsSchema,
  longLeavePolicySchema,
  serviceStaffingTargetsSchema,
  serviceTimeSlotsSettingSchema,
  volunteerRolesSettingSchema,
  weeklyDebriefConfigSchema,
} from './schemas';

interface UpdateAppSettingEdgeResponse {
  success: boolean;
  setting?: {
    key: string;
    value: unknown;
    updated_at: string;
  };
  error?: string;
}

const callUpdateAppSettings = createEdgeFunctionCaller<
  UpdateAppSettingPayload,
  UpdateAppSettingEdgeResponse
>('update-app-settings');

function parseOrDefault<T>(
  raw: unknown,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T } },
  fallback: T,
): T {
  const result = schema.safeParse(raw);
  return result.success && result.data !== undefined ? result.data : fallback;
}

export async function fetchAppSettings(): Promise<AppSettingsMap> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [
      'service_staffing_targets',
      'forecast_confidence_thresholds',
      'attendance_scoring_weights',
      'long_leave_policy',
      'service_time_slots',
      'volunteer_roles',
      'weekly_debrief_config',
    ]);

  if (error) {
    throw new Error(`Failed to fetch app settings: ${error.message}`);
  }

  const byKey = new Map<string, unknown>();
  for (const row of data ?? []) {
    byKey.set(row.key, row.value);
  }

  return {
    service_staffing_targets: parseOrDefault(
      byKey.get('service_staffing_targets'),
      serviceStaffingTargetsSchema,
      DEFAULT_APP_SETTINGS.service_staffing_targets,
    ),
    forecast_confidence_thresholds: parseOrDefault(
      byKey.get('forecast_confidence_thresholds'),
      forecastConfidenceThresholdsSchema,
      DEFAULT_APP_SETTINGS.forecast_confidence_thresholds,
    ),
    attendance_scoring_weights: parseOrDefault(
      byKey.get('attendance_scoring_weights'),
      attendanceScoringWeightsSchema,
      DEFAULT_APP_SETTINGS.attendance_scoring_weights,
    ),
    long_leave_policy: parseOrDefault(
      byKey.get('long_leave_policy'),
      longLeavePolicySchema,
      DEFAULT_APP_SETTINGS.long_leave_policy,
    ),
    service_time_slots: parseOrDefault(
      byKey.get('service_time_slots'),
      serviceTimeSlotsSettingSchema,
      DEFAULT_APP_SETTINGS.service_time_slots,
    ),
    volunteer_roles: parseOrDefault(
      byKey.get('volunteer_roles'),
      volunteerRolesSettingSchema,
      DEFAULT_APP_SETTINGS.volunteer_roles,
    ),
    weekly_debrief_config: parseOrDefault(
      byKey.get('weekly_debrief_config'),
      weeklyDebriefConfigSchema,
      DEFAULT_APP_SETTINGS.weekly_debrief_config,
    ),
  };
}

export async function fetchPublicAppSettings(): Promise<PublicAppSettingsMap> {
  const { data, error } = await supabase.rpc('get_public_app_settings', {
    p_keys: ['long_leave_policy', 'service_time_slots', 'volunteer_roles'],
  });

  if (error) {
    throw new Error(`Failed to fetch public app settings: ${error.message}`);
  }

  const record =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  return {
    long_leave_policy: parseOrDefault(
      record.long_leave_policy,
      longLeavePolicySchema,
      DEFAULT_PUBLIC_APP_SETTINGS.long_leave_policy,
    ),
    service_time_slots: parseOrDefault(
      record.service_time_slots,
      serviceTimeSlotsSettingSchema,
      DEFAULT_PUBLIC_APP_SETTINGS.service_time_slots,
    ),
    volunteer_roles: parseOrDefault(
      record.volunteer_roles,
      volunteerRolesSettingSchema,
      DEFAULT_PUBLIC_APP_SETTINGS.volunteer_roles,
    ),
  };
}

export async function updateAppSetting<K extends EditableSystemSettingKey>(
  payload: UpdateAppSettingPayload<K>,
): Promise<AppSettingsMap[K]> {
  const response = await callUpdateAppSettings(payload);
  if (!response.success || !response.setting) {
    throw new Error(response.error || `Failed to update setting "${payload.key}"`);
  }
  return response.setting.value as AppSettingsMap[K];
}
