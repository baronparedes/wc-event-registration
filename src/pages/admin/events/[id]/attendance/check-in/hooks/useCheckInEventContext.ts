import { useCallback, useMemo } from 'react';

import { toast } from 'sonner';

import {
  useAttendanceSettingsQuery,
  useAttendeesLocalCacheQuery,
} from '@/hooks/domain/attendance/queries';
import { useOfflineCheckInEventSettings } from '@/hooks/domain/attendance/state';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useOnlineStatus } from '@/hooks/utils';
import { canAdminPerform } from '@/lib/domain/auth';

import { isRegistrationOpenNow, isWithinEventWindow } from '../utils';

export function useCheckInEventContext(eventId: string | undefined, nowMs: number) {
  const { data: onlineEvent, isLoading: eventLoading } = useAdminEventQuery(eventId);
  const { data: authState } = useAdminAuthQuery();
  const { data: onlineSettings, isLoading: settingsLoading } = useAttendanceSettingsQuery(eventId);
  const { event, settings, isUsingCachedEvent, isUsingCachedSettings } =
    useOfflineCheckInEventSettings({ eventId, event: onlineEvent, settings: onlineSettings });
  const isUsingCachedEventOrSettings = isUsingCachedEvent || isUsingCachedSettings;
  const attendanceEnabled = settings?.attendance_enabled ?? false;
  const enforceCheckInEventWindow = settings?.enforce_check_in_event_window ?? true;
  const isOutsideEventWindow = event ? !isWithinEventWindow(event, nowMs) : false;
  const isCheckInBlockedByWindow =
    attendanceEnabled && enforceCheckInEventWindow && isOutsideEventWindow;
  const {
    attendees: cachedAttendees,
    cachedAt,
    isLoading: cacheLoading,
    isFetching: cacheFetching,
    isError: isCacheError,
    error: cacheError,
    refresh: refreshCache,
    updateAttendee,
  } = useAttendeesLocalCacheQuery(eventId, {
    realtimeEnabled: Boolean(event && attendanceEnabled && !isOutsideEventWindow),
  });
  const isOnline = useOnlineStatus();
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const isLoading = isUsingCachedEventOrSettings ? false : eventLoading || settingsLoading;
  const registrationOpen = event
    ? isRegistrationOpenNow({
        registration_mode: event.registration_mode,
        registration_opens_at: event.registration_opens_at,
        registration_closes_at: event.registration_closes_at,
        nowMs,
      })
    : false;

  const cacheStatusMessage = useMemo(() => {
    if (cacheLoading || cacheFetching) return 'Loading attendee list...';
    if (isCacheError) {
      return cacheError instanceof Error ? cacheError.message : 'Failed to load attendee cache.';
    }
    if (cachedAttendees) {
      return `${cachedAttendees.length} attendees cached${
        cachedAt ? ` · Updated ${new Date(cachedAt).toLocaleTimeString()}` : ''
      }`;
    }
    return null;
  }, [cacheError, cacheFetching, cacheLoading, cachedAt, cachedAttendees, isCacheError]);

  const handleRefreshCache = useCallback(() => {
    if (!isOnline) {
      toast.error('Cannot refresh the attendee list while offline.');
      return;
    }
    refreshCache();
  }, [isOnline, refreshCache]);

  return {
    event,
    authState,
    settings,
    isUsingCachedEventOrSettings,
    attendanceEnabled,
    enforceCheckInEventWindow,
    isOutsideEventWindow,
    isCheckInBlockedByWindow,
    cachedAttendees,
    cachedAt,
    cacheLoading,
    cacheFetching,
    isCacheError,
    cacheError,
    updateAttendee,
    refreshCache,
    isOnline,
    canWrite,
    isLoading,
    registrationOpen,
    cacheStatusMessage,
    handleRefreshCache,
  };
}
