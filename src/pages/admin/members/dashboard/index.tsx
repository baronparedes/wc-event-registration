import { RefreshCw, Users } from 'lucide-react';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { AlertBanner, Button, EmptyState } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useAdminMembersDashboardQuery } from '@/hooks/domain/members';
import { MembersNavigationTabs } from '@/pages/admin/members/components';

import {
  DashboardKpiCards,
  MemberAgeDemographicsCard,
  MemberCommitmentHeatmapCard,
  MemberDGroupSection,
  MemberRoleDistributionCard,
} from './components';

export function AdminMembersDashboardPage() {
  const { data, isLoading, error, refetch, isRefetching } = useAdminMembersDashboardQuery();

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Members', to: ROUTE_PATHS.adminMembers }, { label: 'Dashboard' }]}
        title="Members Analytics & Dashboard"
        description="Comprehensive insights into primary role distributions, age demographics, Sunday service commitments, and DGroup records."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <AdminBaseNavigation />
      <MembersNavigationTabs />

      <AdminPageShell.Content>
        {isLoading ? (
          <div className="flex flex-col gap-6 animate-pulse py-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-surface/80 border border-border" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-80 rounded-2xl bg-surface/80 border border-border" />
              <div className="h-80 rounded-2xl bg-surface/80 border border-border" />
            </div>
            <div className="h-72 rounded-2xl bg-surface/80 border border-border" />
          </div>
        ) : error ? (
          <div className="py-6">
            <AlertBanner
              variant="error"
              title="Failed to load member analytics"
              description={
                error.message || 'An unexpected error occurred while loading member dashboard data.'
              }
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  Try Again
                </Button>
              }
            />
          </div>
        ) : !data || data.totalActiveMembers === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No active members found"
              description="Member analytics will appear once active members are added to the system."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top KPIs */}
            <DashboardKpiCards data={data} />

            {/* Role Distributions & Age Demographics */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MemberRoleDistributionCard
                roles={data.roleDistributions}
                totalMembers={data.totalActiveMembers}
              />
              <MemberAgeDemographicsCard demographics={data.ageDemographics} />
            </div>

            {/* Sunday Commitment Heatmap */}
            <MemberCommitmentHeatmapCard heatmap={data.commitmentHeatmap} />

            {/* DGroup Analytics & Directory Section */}
            <MemberDGroupSection analytics={data.dgroupAnalytics} />
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
