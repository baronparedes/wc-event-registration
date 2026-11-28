import {
  attendanceScoringWeightsSchema,
  forecastConfidenceThresholdsSchema,
  longLeavePolicySchema,
  serviceStaffingTargetsSchema,
  serviceTimeSlotsSchema,
  volunteerRolesSchema,
  weeklyDebriefConfigSchema,
} from '../_shared/appSettings.ts';
import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import type { Json } from '../_shared/database.types.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { z } from '../_shared/validation.ts';

const PUBLIC_SETTING_KEYS = new Set<string>([
  'long_leave_policy',
  'service_time_slots',
  'volunteer_roles',
]);

const updateAppSettingRequestSchema = z.discriminatedUnion('key', [
  z.object({
    key: z.literal('service_staffing_targets'),
    value: serviceStaffingTargetsSchema,
  }),
  z.object({
    key: z.literal('forecast_confidence_thresholds'),
    value: forecastConfidenceThresholdsSchema,
  }),
  z.object({
    key: z.literal('attendance_scoring_weights'),
    value: attendanceScoringWeightsSchema,
  }),
  z.object({
    key: z.literal('long_leave_policy'),
    value: longLeavePolicySchema,
  }),
  z.object({
    key: z.literal('service_time_slots'),
    value: serviceTimeSlotsSchema,
  }),
  z.object({
    key: z.literal('volunteer_roles'),
    value: volunteerRolesSchema,
  }),
  z.object({
    key: z.literal('weekly_debrief_config'),
    value: weeklyDebriefConfigSchema,
  }),
]);

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function handleUpdateAppSettings(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'update-app-settings',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin'],
    requiredPermission: 'canWriteAdminData',
    rateLimit: {
      scope: 'update-app-settings',
      windowMs: RATE_LIMIT_PRESETS.updateAttendanceSettings.windowMs,
      maxHits: RATE_LIMIT_PRESETS.updateAttendanceSettings.maxHits,
    },
    schema: updateAppSettingRequestSchema,
  });

  if (!guard.valid) {
    return guard.response;
  }

  const { key, value } = guard.data;

  const { data, error } = await guard.client
    .from('app_settings')
    .upsert(
      {
        key,
        value: asJson(value),
        is_public: PUBLIC_SETTING_KEYS.has(key),
        updated_by: guard.userId ?? null,
      },
      { onConflict: 'key' },
    )
    .select('key, value, is_public, description, updated_at, updated_by')
    .single();

  if (error || !data) {
    console.error('[update-app-settings] Upsert failed:', error);
    return jsonResponse(
      500,
      { success: false, error: 'Failed to update application setting' },
      guard.corsHeaders,
    );
  }

  return jsonResponse(200, { success: true, setting: data }, guard.corsHeaders);
}
