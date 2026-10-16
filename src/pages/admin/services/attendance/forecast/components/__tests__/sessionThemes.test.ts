import { describe, expect, it } from 'vitest';

import { FORECAST_CHART_COLORS, getSessionTheme } from '../sessionThemes';

describe('sessionThemes', () => {
  it('defines FORECAST_CHART_COLORS matching brand tokens', () => {
    expect(FORECAST_CHART_COLORS.scheduled).toBe('#1ca0b3'); // Primary
    expect(FORECAST_CHART_COLORS.expected).toBe('#51a29a'); // Secondary
    expect(FORECAST_CHART_COLORS.target).toBe('#f5bd5c'); // Accent
    expect(FORECAST_CHART_COLORS.danger).toBe('#f2685c'); // Danger
  });

  it('returns morning theme with primary border accent for 9AM', () => {
    const theme = getSessionTheme('9AM');
    expect(theme.slotLabel).toBe('9 AM');
    expect(theme.tag).toBe('Morning');
    expect(theme.borderAccent).toContain('primary');
    expect(theme.dotColor).toContain('primary');
  });

  it('returns midday theme with secondary border accent for 12NN', () => {
    const theme = getSessionTheme('12NN');
    expect(theme.slotLabel).toBe('12 NN');
    expect(theme.tag).toBe('Midday');
    expect(theme.borderAccent).toContain('secondary');
    expect(theme.dotColor).toContain('secondary');
  });

  it('returns afternoon theme with tertiary border accent for 3PM', () => {
    const theme = getSessionTheme('3PM');
    expect(theme.slotLabel).toBe('3 PM');
    expect(theme.tag).toBe('Afternoon');
    expect(theme.borderAccent).toContain('tertiary');
    expect(theme.dotColor).toContain('tertiary');
  });

  it('returns fallback theme for null, undefined or unrecognized slot', () => {
    const themeNull = getSessionTheme(null);
    expect(themeNull.slotLabel).toBe('ALL');
    expect(themeNull.tag).toBe('All Sessions');

    const themeCustom = getSessionTheme('CUSTOM');
    expect(themeCustom.slotLabel).toBe('CUSTOM');
  });
});
