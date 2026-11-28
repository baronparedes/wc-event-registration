import { describe, expect, it } from 'vitest';

import { DEFAULT_APP_SETTINGS } from '../defaults';
import {
  attendanceScoringWeightsSchema,
  forecastConfidenceThresholdsSchema,
  longLeavePolicySchema,
  serviceStaffingTargetsSchema,
  serviceTimeSlotsSettingSchema,
  volunteerRolesSettingSchema,
  weeklyDebriefConfigSchema,
} from '../schemas';

describe('app-settings schemas', () => {
  it('validates all default app settings cleanly', () => {
    expect(
      serviceStaffingTargetsSchema.safeParse(DEFAULT_APP_SETTINGS.service_staffing_targets).success,
    ).toBe(true);
    expect(
      forecastConfidenceThresholdsSchema.safeParse(
        DEFAULT_APP_SETTINGS.forecast_confidence_thresholds,
      ).success,
    ).toBe(true);
    expect(
      attendanceScoringWeightsSchema.safeParse(DEFAULT_APP_SETTINGS.attendance_scoring_weights)
        .success,
    ).toBe(true);
    expect(longLeavePolicySchema.safeParse(DEFAULT_APP_SETTINGS.long_leave_policy).success).toBe(
      true,
    );
    expect(
      serviceTimeSlotsSettingSchema.safeParse(DEFAULT_APP_SETTINGS.service_time_slots).success,
    ).toBe(true);
    expect(
      volunteerRolesSettingSchema.safeParse(DEFAULT_APP_SETTINGS.volunteer_roles).success,
    ).toBe(true);
    expect(
      weeklyDebriefConfigSchema.safeParse(DEFAULT_APP_SETTINGS.weekly_debrief_config).success,
    ).toBe(true);
  });

  it('rejects confidence thresholds where solid < moderate', () => {
    const result = forecastConfidenceThresholdsSchema.safeParse({
      solid: 0.3,
      moderate: 0.5,
      default_turnup_rate: 0.8,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate time slot keys or zero active slots', () => {
    expect(
      serviceTimeSlotsSettingSchema.safeParse([
        { key: '9AM', label: '9:00 AM', sort_order: 1, is_active: true },
        { key: '9AM', label: '9:00 AM Duplicate', sort_order: 2, is_active: true },
      ]).success,
    ).toBe(false);

    expect(
      serviceTimeSlotsSettingSchema.safeParse([
        { key: '9AM', label: '9:00 AM', sort_order: 1, is_active: false },
      ]).success,
    ).toBe(false);
  });

  it('rejects empty weekly debrief recipient roles', () => {
    expect(weeklyDebriefConfigSchema.safeParse({ recipient_roles: [] }).success).toBe(false);
  });
});
