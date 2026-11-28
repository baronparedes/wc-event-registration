import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAppSettings, fetchPublicAppSettings, updateAppSetting } from '../api';
import { DEFAULT_APP_SETTINGS, DEFAULT_PUBLIC_APP_SETTINGS } from '../defaults';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  edgeCaller: vi.fn(),
}));

vi.mock('@/lib/infrastructure', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
  createEdgeFunctionCaller: () => mocks.edgeCaller,
}));

describe('app-settings API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches app settings and falls back to defaults for missing or malformed keys', async () => {
    const inMock = vi.fn().mockResolvedValue({
      data: [
        {
          key: 'long_leave_policy',
          value: { min_days: 35, min_weeks: 5, require_sunday_dates: true },
        },
        {
          key: 'weekly_debrief_config',
          value: { recipient_roles: [] }, // invalid -> should fall back to default
        },
      ],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ in: inMock });
    mocks.from.mockReturnValue({ select: selectMock });

    const result = await fetchAppSettings();

    expect(mocks.from).toHaveBeenCalledWith('app_settings');
    expect(result.long_leave_policy).toEqual({
      min_days: 35,
      min_weeks: 5,
      require_sunday_dates: true,
    });
    expect(result.weekly_debrief_config).toEqual(DEFAULT_APP_SETTINGS.weekly_debrief_config);
    expect(result.service_staffing_targets).toEqual(DEFAULT_APP_SETTINGS.service_staffing_targets);
  });

  it('throws when fetching app settings fails', async () => {
    const inMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB offline' } });
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue({ in: inMock }) });

    await expect(fetchAppSettings()).rejects.toThrow('Failed to fetch app settings: DB offline');
  });

  it('fetches public app settings via RPC with safe defaults', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        long_leave_policy: { min_days: 21, min_weeks: 3, require_sunday_dates: true },
      },
      error: null,
    });

    const result = await fetchPublicAppSettings();

    expect(mocks.rpc).toHaveBeenCalledWith('get_public_app_settings', {
      p_keys: ['long_leave_policy', 'service_time_slots', 'volunteer_roles'],
    });
    expect(result.long_leave_policy.min_days).toBe(21);
    expect(result.service_time_slots).toEqual(DEFAULT_PUBLIC_APP_SETTINGS.service_time_slots);
    expect(result.volunteer_roles).toEqual(DEFAULT_PUBLIC_APP_SETTINGS.volunteer_roles);
  });

  it('updates an app setting via edge function and throws on failure', async () => {
    const updated = { recipient_roles: ['OIC', 'admin'] };
    mocks.edgeCaller.mockResolvedValueOnce({
      success: true,
      setting: { key: 'weekly_debrief_config', value: updated, updated_at: '2026-11-28T00:00:00Z' },
    });

    await expect(
      updateAppSetting({ key: 'weekly_debrief_config', value: updated }),
    ).resolves.toEqual(updated);

    mocks.edgeCaller.mockResolvedValueOnce({
      success: false,
      error: 'Forbidden',
    });

    await expect(
      updateAppSetting({ key: 'weekly_debrief_config', value: updated }),
    ).rejects.toThrow('Forbidden');
  });
});
