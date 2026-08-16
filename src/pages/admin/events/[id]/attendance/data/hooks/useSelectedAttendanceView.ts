import { useCallback, useEffect, useRef, useState } from 'react';

import type { NavigateFunction } from 'react-router-dom';

import { useLocalStorage } from '@/hooks/utils';
import { type AttendeeViewConfig, attendeeViewConfigSchema } from '@/lib/domain/attendance-views';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views/types';

const SELECTED_VIEW_STORAGE_PREFIX = 'wc:attendance-data:selected-view';

function getSelectedViewStorageKey(eventId: string): string {
  return `${SELECTED_VIEW_STORAGE_PREFIX}:${eventId}`;
}

type UseSelectedAttendanceViewParams = {
  eventId?: string;
  viewIdParam: string | null;
  savedView?: AttendanceSavedView;
  searchParams: URLSearchParams;
  navigate: NavigateFunction;
  applyViewConfig: (config: AttendeeViewConfig) => void;
  clearViewControls: () => void;
};

export function useSelectedAttendanceView({
  eventId,
  viewIdParam,
  savedView,
  searchParams,
  navigate,
  applyViewConfig,
  clearViewControls,
}: UseSelectedAttendanceViewParams) {
  const [activeSavedViewConfig, setActiveSavedViewConfig] = useState<AttendeeViewConfig | null>(
    null,
  );
  const appliedViewIdRef = useRef<string | null>(null);
  const persistedViewIdRef = useRef<string | null>(null);
  const selectedViewStorage = useLocalStorage<string>(
    eventId ? getSelectedViewStorageKey(eventId) : null,
    { parse: (raw) => raw, stringify: (value) => value },
  );

  const handleApplyViewConfig = useCallback(
    (config: AttendeeViewConfig) => {
      const normalizedConfig = attendeeViewConfigSchema.parse(config);
      setActiveSavedViewConfig(normalizedConfig);
      applyViewConfig(normalizedConfig);
    },
    [applyViewConfig],
  );

  useEffect(() => {
    if (viewIdParam && appliedViewIdRef.current !== viewIdParam && savedView?.view_config) {
      handleApplyViewConfig(savedView.view_config);
      appliedViewIdRef.current = viewIdParam;
    }
  }, [handleApplyViewConfig, savedView, viewIdParam]);

  useEffect(() => {
    if (!eventId) return;

    if (viewIdParam) {
      if (persistedViewIdRef.current !== viewIdParam) {
        selectedViewStorage.set(viewIdParam);
        persistedViewIdRef.current = viewIdParam;
      }
      return;
    }

    persistedViewIdRef.current = null;
    const storedViewId = selectedViewStorage.get()?.trim() || null;
    if (!storedViewId) return;

    const params = new URLSearchParams(searchParams);
    params.set('viewId', storedViewId);
    navigate({ search: `?${params.toString()}` }, { replace: true });
  }, [eventId, navigate, searchParams, selectedViewStorage, viewIdParam]);

  const handleClearView = useCallback(() => {
    clearViewControls();
    appliedViewIdRef.current = null;
    setActiveSavedViewConfig(null);
    selectedViewStorage.remove();

    const params = new URLSearchParams(searchParams);
    params.delete('viewId');
    navigate({ search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  }, [clearViewControls, navigate, searchParams, selectedViewStorage]);

  const clearSelectedView = useCallback(() => {
    selectedViewStorage.remove();
    appliedViewIdRef.current = null;
    setActiveSavedViewConfig(null);
    clearViewControls();
  }, [clearViewControls, selectedViewStorage]);

  return { activeSavedViewConfig, handleApplyViewConfig, handleClearView, clearSelectedView };
}
