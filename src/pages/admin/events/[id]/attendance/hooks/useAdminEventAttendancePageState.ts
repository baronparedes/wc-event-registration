import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  useAttendanceSettingsQuery,
  useUpdateAttendanceSettingsMutation,
} from '@/hooks/domain/attendance';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventQuery } from '@/hooks/domain/events';
import {
  type AttendanceTimeslotConfig,
  type UpdateAttendanceSettingsInput,
  updateAttendanceSettingsSchema,
} from '@/lib/domain/attendance';
import { canWriteAdminData } from '@/lib/domain/auth';
import { localDateTimeToUTC8ISO } from '@/lib/infrastructure';

const ATTENDANCE_TOAST_MESSAGES = {
  updated: 'Attendance settings updated successfully.',
  updateFailed: 'Failed to update attendance settings.',
} as const;

type AttendanceSettingsFormInput = z.input<typeof updateAttendanceSettingsSchema>;

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).slice(0, 16).replace(' ', 'T');
}

function isWithinEventWindow(
  slotIso: string,
  startsAt: string | null,
  endsAt: string | null,
): boolean {
  const slotMs = new Date(slotIso).getTime();
  const startMs = startsAt ? new Date(startsAt).getTime() : Number.NaN;
  const endMs = endsAt ? new Date(endsAt).getTime() : Number.NaN;

  if (!Number.isFinite(slotMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return false;
  }

  return slotMs >= startMs && slotMs <= endMs;
}

function createEmptyTimeslot(): AttendanceTimeslotConfig {
  return {
    slot_at: '',
    opens_at: null,
    closes_at: null,
  };
}

export function useAdminEventAttendancePageState(eventId: string | undefined) {
  const { data: authState, isLoading: isAuthLoading } = useAdminAuthQuery();
  const canLoadAdminData = !isAuthLoading && (authState?.isAuthenticated ?? false);

  const { data: event, isLoading: isEventLoading } = useAdminEventQuery(
    canLoadAdminData ? eventId : undefined,
  );
  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useAttendanceSettingsQuery(eventId, canLoadAdminData);
  const updateMutation = useUpdateAttendanceSettingsMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<AttendanceSettingsFormInput>({
    resolver: zodResolver(updateAttendanceSettingsSchema),
    defaultValues: {
      event_id: eventId ?? '',
      attendance_enabled: false,
      timeslot_enabled: false,
      enforce_check_in_event_window: true,
      timeslots: [],
    },
  });

  useEffect(() => {
    if (!eventId) return;
    setValue('event_id', eventId);
  }, [eventId, setValue]);

  useEffect(() => {
    if (!settings) return;

    reset(settings);
  }, [settings, reset]);

  const attendanceEnabled = useWatch({ control, name: 'attendance_enabled' });
  const timeslotEnabled = useWatch({ control, name: 'timeslot_enabled' });
  const timeslots = useWatch({ control, name: 'timeslots' });
  const effectiveTimeslots = timeslots ?? [];

  useEffect(() => {
    if (!settings || !isDirty || attendanceEnabled !== false) return;

    setValue('timeslot_enabled', false, { shouldDirty: false, shouldValidate: true });
    setValue('enforce_check_in_event_window', true, { shouldDirty: false, shouldValidate: true });
    setValue('timeslots', [], { shouldDirty: false, shouldValidate: true });
  }, [attendanceEnabled, isDirty, settings, setValue]);

  useEffect(() => {
    if (!settings || !isDirty || timeslotEnabled !== false) return;

    setValue('timeslots', [], { shouldDirty: false, shouldValidate: true });
  }, [timeslotEnabled, isDirty, settings, setValue]);

  const isArchived = event?.status === 'archived';
  const canWrite = canWriteAdminData(authState?.adminRole);
  const eventStartLocal = toDatetimeLocal(event?.starts_at);
  const eventEndLocal = toDatetimeLocal(event?.ends_at);

  function addTimeslot() {
    setValue('timeslots', [...effectiveTimeslots, createEmptyTimeslot()], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function removeTimeslot(index: number) {
    setValue(
      'timeslots',
      effectiveTimeslots.filter((_, entryIndex) => entryIndex !== index),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  }

  function updateTimeslotField(
    index: number,
    field: keyof AttendanceTimeslotConfig,
    localValue: string,
  ) {
    const next = [...effectiveTimeslots];
    const current = next[index] ?? createEmptyTimeslot();
    const normalizedValue = localValue ? localDateTimeToUTC8ISO(localValue) : null;

    next[index] = {
      ...current,
      [field]: field === 'slot_at' ? (normalizedValue ?? '') : normalizedValue,
    };

    setValue('timeslots', next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function submitAttendanceSettings(formValues: AttendanceSettingsFormInput) {
    if (!eventId || !event) {
      toast.error(ATTENDANCE_TOAST_MESSAGES.updateFailed);
      return;
    }

    const payload: UpdateAttendanceSettingsInput = {
      ...formValues,
      event_id: eventId,
      timeslot_enabled: formValues.attendance_enabled ? formValues.timeslot_enabled : false,
      enforce_check_in_event_window: formValues.attendance_enabled
        ? (formValues.enforce_check_in_event_window ?? true)
        : true,
      timeslots:
        formValues.attendance_enabled && formValues.timeslot_enabled
          ? (formValues.timeslots ?? [])
          : [],
    };

    if (payload.attendance_enabled && payload.timeslot_enabled) {
      if (!event.starts_at || !event.ends_at) {
        toast.error('Event start and end date-time are required for timeslot attendance.');
        return;
      }

      const hasOutOfRangeTimeslot = payload.timeslots.some(
        (slot) =>
          !isWithinEventWindow(slot.slot_at, event.starts_at, event.ends_at) ||
          (slot.opens_at !== null &&
            !isWithinEventWindow(slot.opens_at, event.starts_at, event.ends_at)) ||
          (slot.closes_at !== null &&
            !isWithinEventWindow(slot.closes_at, event.starts_at, event.ends_at)),
      );

      if (hasOutOfRangeTimeslot) {
        toast.error(
          'All timeslots and optional window bounds must be within the event start and end date-time window.',
        );
        return;
      }
    }

    try {
      await updateMutation.mutateAsync(payload);
      toast.success(ATTENDANCE_TOAST_MESSAGES.updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : ATTENDANCE_TOAST_MESSAGES.updateFailed;
      toast.error(message);
    }
  }

  return {
    attendanceEnabled,
    authState,
    canWrite,
    effectiveTimeslots,
    errors,
    event,
    eventEndLocal,
    eventStartLocal,
    handleSubmit,
    isArchived,
    isAuthLoading,
    isDirty,
    isEventLoading,
    isSettingsLoading,
    register,
    settingsError,
    submitAttendanceSettings,
    timeslotEnabled,
    updateMutation,
    addTimeslot,
    removeTimeslot,
    updateTimeslotField,
  };
}
