import { Cake, CalendarCheck, Database, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';

import { StatCard } from '@/components/ui';
import type { MemberDashboardData } from '@/lib/domain/members';

interface DashboardKpiCardsProps {
  data: MemberDashboardData;
  onInactiveVolunteersClick?: () => void;
  onVmtMigrationClick?: () => void;
}

export function DashboardKpiCards({
  data,
  onInactiveVolunteersClick,
  onVmtMigrationClick,
}: DashboardKpiCardsProps) {
  const {
    totalActiveMembers,
    dgroupAnalytics,
    commitmentHeatmap,
    ageDemographics,
    inactivityAnalytics,
    vmtMigrationAnalytics,
  } = data;

  const ageSubtitle =
    ageDemographics.totalWithDob > 0
      ? `${ageDemographics.totalWithDob} of ${totalActiveMembers} records (${ageDemographics.coveragePercentage}%)`
      : 'No DOB recorded';

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <StatCard
        title="Active Members"
        value={totalActiveMembers}
        subtitle="Total registered members"
        icon={<Users className="h-4 w-4" />}
        variant="primary"
      />
      <StatCard
        title="DGroup Participation"
        value={`${dgroupAnalytics.coveragePercentage}%`}
        subtitle={`${dgroupAnalytics.inDGroupCount} members in DGroup`}
        icon={<UserCheck className="h-4 w-4" />}
        variant="secondary"
      />
      <StatCard
        title="DGroup Leaders"
        value={dgroupAnalytics.dgroupLeaderCount}
        subtitle="Active group leaders"
        icon={<ShieldCheck className="h-4 w-4" />}
        variant="accent"
      />
      <StatCard
        title="Sunday Volunteers"
        value={commitmentHeatmap.totalCommittedMembers}
        subtitle="With Sunday schedule"
        icon={<CalendarCheck className="h-4 w-4" />}
        variant="tertiary"
      />
      <button
        type="button"
        onClick={onInactiveVolunteersClick}
        aria-label={`View ${inactivityAnalytics.inactiveCount} inactive volunteers (> ${inactivityAnalytics.thresholdSundays} Sundays)`}
        className="group text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <StatCard
          title="Inactive Volunteers"
          value={inactivityAnalytics.inactiveCount}
          subtitle={`> ${inactivityAnalytics.thresholdSundays} Sundays · View list`}
          icon={<UserX className="h-4 w-4" />}
          variant="danger"
          className="h-full transition-colors group-hover:border-danger/60 group-hover:bg-danger/5"
        />
      </button>
      <button
        type="button"
        onClick={onVmtMigrationClick}
        aria-label={`View ${vmtMigrationAnalytics.missingCount} members missing CCF VMT data`}
        className="group text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <StatCard
          title="Missing CCF VMT"
          value={vmtMigrationAnalytics.missingCount}
          subtitle={`${vmtMigrationAnalytics.migratedPercentage}% migrated · View list`}
          icon={<Database className="h-4 w-4" />}
          variant={vmtMigrationAnalytics.missingCount > 0 ? 'accent' : 'secondary'}
          className="h-full transition-colors group-hover:border-primary/60 group-hover:bg-primary/5"
        />
      </button>
      <StatCard
        title="Average Age"
        value={ageDemographics.averageAge !== null ? `${ageDemographics.averageAge} yrs` : 'N/A'}
        subtitle={ageSubtitle}
        icon={<Cake className="h-4 w-4" />}
        variant="default"
      />
    </div>
  );
}
