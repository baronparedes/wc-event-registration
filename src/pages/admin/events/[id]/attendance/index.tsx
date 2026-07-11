import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { AdminPageShell } from '@/components/layout';
import { Button, SectionCard } from '@/components/ui';
import { ROUTE_PATHS, toAdminEventDetail } from '@/config/constants';
import {
  useAttendanceSettingsQuery,
  useUpdateAttendanceSettingsMutation,
} from '@/hooks/domain/attendance';
import { useAdminEventQuery } from '@/hooks/domain/events';
import {
  type UpdateAttendanceSettingsInput,
  updateAttendanceSettingsSchema,
} from '@/lib/domain/attendance';
import { formatDateTime, localDateTimeToUTC8ISO } from '@/lib/infrastructure';
import { EventNavigationLinks } from '@/pages/admin/events/components';

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

export function AdminEventAttendancePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: event, isLoading: isEventLoading } = useAdminEventQuery(eventId);
  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useAttendanceSettingsQuery(eventId);
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
    if (attendanceEnabled !== false) return;

    setValue('timeslot_enabled', false, { shouldDirty: true, shouldValidate: true });
    setValue('timeslots', [], { shouldDirty: true, shouldValidate: true });
  }, [attendanceEnabled, setValue]);

  useEffect(() => {
    if (timeslotEnabled !== false) return;

    setValue('timeslots', [], { shouldDirty: true, shouldValidate: true });
  }, [timeslotEnabled, setValue]);

  if (!eventId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Attendance" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid event ID.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const resolvedEventId = eventId ?? '';

  if (isEventLoading || isSettingsLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage="Loading attendance settings...">
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (!event) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Attendance" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Event not found.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (settingsError) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Attendance" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Failed to load attendance settings.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const activeEvent = event;
  const isArchived = activeEvent.status === 'archived';
  const eventStartLocal = toDatetimeLocal(activeEvent.starts_at);
  const eventEndLocal = toDatetimeLocal(activeEvent.ends_at);

  function addTimeslot() {
    setValue('timeslots', [...effectiveTimeslots, ''], {
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

  function updateTimeslot(index: number, localValue: string) {
    const next = [...effectiveTimeslots];
    next[index] = localValue ? (localDateTimeToUTC8ISO(localValue) ?? '') : '';

    setValue('timeslots', next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function onSubmit(formValues: AttendanceSettingsFormInput) {
    const requiredEventId = resolvedEventId;

    if (!requiredEventId) {
      toast.error(ATTENDANCE_TOAST_MESSAGES.updateFailed);
      return;
    }

    const payload: UpdateAttendanceSettingsInput = {
      ...formValues,
      event_id: requiredEventId,
      timeslot_enabled: formValues.attendance_enabled ? formValues.timeslot_enabled : false,
      timeslots:
        formValues.attendance_enabled && formValues.timeslot_enabled
          ? (formValues.timeslots ?? [])
          : [],
    };

    if (payload.attendance_enabled && payload.timeslot_enabled) {
      if (!activeEvent.starts_at || !activeEvent.ends_at) {
        toast.error('Event start and end date-time are required for timeslot attendance.');
        return;
      }

      const hasOutOfRangeTimeslot = payload.timeslots.some(
        (slot) => !isWithinEventWindow(slot, activeEvent.starts_at, activeEvent.ends_at),
      );

      if (hasOutOfRangeTimeslot) {
        toast.error('All timeslots must be within the event start and end date-time window.');
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

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: activeEvent.title, to: toAdminEventDetail(resolvedEventId) },
          { label: 'Attendance' },
        ]}
        navLinks={<EventNavigationLinks eventId={resolvedEventId} currentSection="attendance" />}
        title="Manage Attendance"
        description="Configure event-day attendance tracking and timeslot attendance behavior."
      />

      {isArchived && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Archived event</p>
          <p className="mt-1 text-xs text-amber-700">
            Attendance settings are read-only for archived events.
          </p>
        </div>
      )}

      <AdminPageShell.Content>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <SectionCard title="Attendance Controls">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={isArchived}
                    {...register('attendance_enabled')}
                    className="h-4 w-4 cursor-pointer rounded border-border"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-text">
                      Enable attendance tracking
                    </span>
                    <span className="text-xs text-muted">
                      Allows check-in operations and attendance export for this event.
                    </span>
                  </div>
                </label>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={isArchived || !attendanceEnabled}
                    {...register('timeslot_enabled')}
                    className="h-4 w-4 cursor-pointer rounded border-border"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-text">
                      Enable timeslot attendance
                    </span>
                    <span className="text-xs text-muted">
                      Records attendance by configured slots (for example: 9AM, 12NN, 3PM).
                    </span>
                  </div>
                </label>
              </div>

              {timeslotEnabled && attendanceEnabled && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Timeslots</label>
                  <p className="text-xs text-muted">
                    Event window: {formatDateTime(activeEvent.starts_at)} to{' '}
                    {formatDateTime(activeEvent.ends_at)}
                  </p>

                  <div className="space-y-2">
                    {effectiveTimeslots.map((slot, index) => (
                      <div key={`timeslot-${index}`} className="flex gap-2">
                        <input
                          type="datetime-local"
                          disabled={isArchived}
                          min={eventStartLocal || undefined}
                          max={eventEndLocal || undefined}
                          value={toDatetimeLocal(slot)}
                          onChange={(event) => updateTimeslot(index, event.target.value)}
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isArchived}
                          onClick={() => removeTimeslot(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isArchived}
                    onClick={addTimeslot}
                  >
                    Add Timeslot
                  </Button>
                  <p className="text-xs text-muted">
                    Pick date-time slots within the event start and end date-time range.
                  </p>
                  {errors.timeslots && (
                    <p className="text-xs text-red-600">{errors.timeslots.message}</p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isArchived || updateMutation.isPending || !isDirty}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Attendance Settings'}
            </Button>
          </div>
        </form>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
