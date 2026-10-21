import { Cake, CalendarCheck, ShieldCheck, UserCheck, Users } from 'lucide-react';

import { StatCard } from '@/components/ui';
import type { MemberDashboardData } from '@/lib/domain/members';

interface DashboardKpiCardsProps {
  data: MemberDashboardData;
}

export function DashboardKpiCards({ data }: DashboardKpiCardsProps) {
  const { totalActiveMembers, dgroupAnalytics, commitmentHeatmap, ageDemographics } = data;

  const ageSubtitle =
    ageDemographics.totalWithDob > 0
      ? `${ageDemographics.totalWithDob} of ${totalActiveMembers} records (${ageDemographics.coveragePercentage}%)`
      : 'No DOB recorded';

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
