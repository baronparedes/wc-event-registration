import { renderHookWithClient } from '@/__tests__/unit-test-utils';

import { useOfflineCheckInEventSettings } from '../useOfflineCheckInEventSettings';

describe('useOfflineCheckInEventSettings.ts', () => {
  it('returns the event and settings from localStorage when offline', () => {
    const eventId = 'event-1';
    const event = { id: eventId, name: 'Event 1' };
    const settings = { enabled: true };

    // Set the localStorage values
    localStorage.setItem(`wc:attendance:check-in-event:${eventId}`, JSON.stringify(event));
    localStorage.setItem(`wc:attendance:check-in-settings:${eventId}`, JSON.stringify(settings));

    const { result } = renderHookWithClient(() =>
      useOfflineCheckInEventSettings({ eventId, event: null, settings: undefined }),
    );

    expect(result.current.event).toEqual(event);
    expect(result.current.settings).toEqual(settings);
    expect(result.current.isUsingCachedEvent).toBe(true);
    expect(result.current.isUsingCachedSettings).toBe(true);
  });
});
