import { useEffect } from 'react';

import { useLocalStorage } from '@/hooks/utils';
import type { AttendanceSettings } from '@/lib/domain/attendance';
import type { AdminEvent } from '@/lib/domain/events';

type UseOfflineCheckInEventSettingsInput = {
  eventId: string | undefined;
  event: AdminEvent | null | undefined;
  settings: AttendanceSettings | undefined;
};

function getEventStorageKey(eventId: string): string {
  return `wc:attendance:check-in-event:${eventId}`;
}

function getSettingsStorageKey(eventId: string): string {
  return `wc:attendance:check-in-settings:${eventId}`;
}

/**
 * Keeps a localStorage copy of the event and attendance settings so the Check-In wizard
 * can still gate on them (attendance enabled, timeslots, event window) after a cold start offline.
 */
export function useOfflineCheckInEventSettings({
  eventId,
  event,
  settings,
}: UseOfflineCheckInEventSettingsInput) {
  const eventStorage = useLocalStorage<AdminEvent>(eventId ? getEventStorageKey(eventId) : null);
  const settingsStorage = useLocalStorage<AttendanceSettings>(
    eventId ? getSettingsStorageKey(eventId) : null,
  );

  useEffect(() => {
    if (event) {
      eventStorage.set(event);
    }
  }, [event, eventStorage]);

  useEffect(() => {
    if (settings) {
      settingsStorage.set(settings);
    }
  }, [settings, settingsStorage]);

  const cachedEvent = eventStorage.get();
  const cachedSettings = settingsStorage.get();

  return {
    event: event ?? cachedEvent,
    settings: settings ?? cachedSettings,
    isUsingCachedEvent: !event && Boolean(cachedEvent),
    isUsingCachedSettings: !settings && Boolean(cachedSettings),
  };
}
