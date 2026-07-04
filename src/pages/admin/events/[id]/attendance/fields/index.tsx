import { useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import { ROUTE_PATHS, toAdminEventAttendance } from '@/config/constants';
import { useAttendanceSettingsQuery } from '@/hooks/domain/attendance';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import type { AttendanceField } from '@/lib/domain/attendance-fields';

import { AttendanceFieldEditPanel, AttendanceFieldsList } from './components';

type PanelState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; field: AttendanceField };

export function AdminAttendanceFieldsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(id);
  const { data: fields, isLoading: fieldsLoading } = useAttendanceFieldsQuery(id);
  const [panelState, setPanelState] = useState<PanelState>({ mode: 'closed' });

  const isLoading = eventLoading || settingsLoading || fieldsLoading;
  const attendanceEnabled = settings?.attendance_enabled ?? false;
  const panelField: AttendanceField | null = panelState.mode === 'edit' ? panelState.field : null;

  function openCreate() {
    setPanelState({ mode: 'create' });
  }

  function openEdit(field: AttendanceField) {
    setPanelState({ mode: 'edit', field });
  }

  function closePanel() {
    setPanelState({ mode: 'closed' });
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: id ? toAdminEventAttendance(id) : undefined },
          { label: 'Attendance Fields' },
        ]}
        navLinks={
          id ? (
            <ActionLink to={toAdminEventAttendance(id)}>Back to Attendance</ActionLink>
          ) : undefined
        }
        title="Attendance Fields"
        description={
          event
            ? `Manage the attendance data fields for ${event.title}`
            : 'Manage attendance data fields'
        }
        actions={
          <Button
            type="button"
            variant="default"
            onClick={openCreate}
            disabled={!attendanceEnabled}
            title={!attendanceEnabled ? 'Enable attendance tracking first.' : undefined}
          >
            Add Field
          </Button>
        }
      />

      {!isLoading && !attendanceEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Attendance tracking is disabled</p>
          <p className="mt-1 text-xs text-amber-700">
            Enable attendance tracking in{' '}
            {id ? (
              <ActionLink to={toAdminEventAttendance(id)}>Attendance Settings</ActionLink>
            ) : (
              'Attendance Settings'
            )}{' '}
            to configure fields.
          </p>
        </div>
      )}

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading fields...">
        {!event ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Event not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminEvents}>
              Back to events
            </Link>
          </div>
        ) : (
          <>
            <AttendanceFieldsList fields={fields ?? []} eventId={id ?? ''} onEdit={openEdit} />

            {panelState.mode !== 'closed' && id && (
              <AttendanceFieldEditPanel eventId={id} field={panelField} onClose={closePanel} />
            )}
          </>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
