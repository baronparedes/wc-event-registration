import { useState } from 'react';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { AlertBanner, ButtonGroup, type ButtonGroupOption, Spinner } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useAppSettingsQuery } from '@/hooks/domain/app-settings';

import {
  AutomatedJobsTab,
  RolesAndSlotsTab,
  ScoringAndLeaveTab,
  StaffingAndForecastTab,
} from './components';

type SystemSettingsTab = 'staffing' | 'scoring_leave' | 'roles_slots' | 'jobs';

const TAB_OPTIONS: ButtonGroupOption<SystemSettingsTab>[] = [
  { value: 'staffing', label: 'Staffing & Forecast' },
  { value: 'scoring_leave', label: 'Scoring & Leave Policy' },
  { value: 'roles_slots', label: 'Roles & Time Slots' },
  { value: 'jobs', label: 'Automated Jobs' },
];

export function AdminSystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<SystemSettingsTab>('staffing');
  const { data: settings, isLoading, isError, error } = useAppSettingsQuery();

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="System & Service Settings"
        description="Manage database-backed operational defaults shared across Hub Calendar, Services, Long Leave, Recruitment, AI Chat, and automated jobs."
        breadcrumbs={[
          { label: 'Settings', to: ROUTE_PATHS.adminSettings },
          { label: 'System & Service Settings' },
        ]}
      />

      <AdminBaseNavigation />

      <AdminPageShell.Filters>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ButtonGroup<SystemSettingsTab>
            value={activeTab}
            onChange={(val) => setActiveTab(val as SystemSettingsTab)}
            options={TAB_OPTIONS}
            size="sm"
          />
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content>
        {(() => {
          if (isLoading && !settings) {
            return (
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border bg-surface">
                <Spinner size="lg" />
              </div>
            );
          }
          if (isError) {
            return (
              <AlertBanner
                variant="error"
                title="Failed to load system settings"
                description={
                  error instanceof Error ? error.message : 'Unable to fetch app settings.'
                }
              />
            );
          }
          if (!settings) {
            return null;
          }
          return (
            <>
              {activeTab === 'staffing' && <StaffingAndForecastTab settings={settings} />}
              {activeTab === 'scoring_leave' && <ScoringAndLeaveTab settings={settings} />}
              {activeTab === 'roles_slots' && <RolesAndSlotsTab settings={settings} />}
              {activeTab === 'jobs' && <AutomatedJobsTab settings={settings} />}
            </>
          );
        })()}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
