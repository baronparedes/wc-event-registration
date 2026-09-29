import { useMemo } from 'react';

import { BarChart3 } from 'lucide-react';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  Badge,
  EmptyState,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
  SectionCard,
} from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useBroadcastDashboardStatsQuery } from '@/hooks/domain/notifications';
import { formatDateOnly } from '@/lib/infrastructure/dateFormat';

export function AdminNotificationsDashboardPage() {
  const { data, isLoading, error } = useBroadcastDashboardStatsQuery();

  const subscriptionPercentage = useMemo(() => {
    if (!data || data.total_users === 0) return 0;
    return Math.round((data.subscribed_users / data.total_users) * 100);
  }, [data]);

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        title="Broadcast Dashboard"
        description="Analytics and metrics for push notifications and broadcast campaigns."
        breadcrumbs={[{ label: 'Settings', to: ROUTE_PATHS.adminSettings }, { label: 'Dashboard' }]}
      />

      <AdminBaseNavigation />

      <AdminPageShell.Content>
        {isLoading ? (
          <div>Loading...</div>
        ) : error ? (
          <div>Error loading data</div>
        ) : !data ? (
          <div>No data available</div>
        ) : (
          <div className="space-y-6">
            <SectionCard title="Subscription Metrics">
              <div className="flex items-center gap-4 py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Push Notification Subscribers</p>
                  <p className="text-3xl font-bold text-text">{subscriptionPercentage}%</p>
                  <p className="text-xs text-muted">
                    ({data.subscribed_users} out of {data.total_users} total users)
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Campaign Performance"
              subtitle="Read rates for broadcast campaigns (excluding specific user targets)"
            >
              {data.campaigns.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-8 w-8 text-muted" />}
                  title="No campaigns found"
                  description="You have not sent any broadcast campaigns yet."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <ListTable>
                    <ListTableHead>
                      <ListTableHeaderRow>
                        <ListTableHeaderCell>Campaign</ListTableHeaderCell>
                        <ListTableHeaderCell>Sent Date</ListTableHeaderCell>
                        <ListTableHeaderCell>Target</ListTableHeaderCell>
                        <ListTableHeaderCell align="right">Recipients</ListTableHeaderCell>
                        <ListTableHeaderCell align="right">Read Rate</ListTableHeaderCell>
                      </ListTableHeaderRow>
                    </ListTableHead>
                    <ListTableBody>
                      {data.campaigns.map((campaign) => {
                        const readRate =
                          campaign.total_recipients > 0
                            ? Math.round((campaign.read_count / campaign.total_recipients) * 100)
                            : 0;

                        return (
                          <ListTableRow key={campaign.id}>
                            <ListTableCell>
                              <p className="font-medium text-text">{campaign.title}</p>
                            </ListTableCell>
                            <ListTableCell>{formatDateOnly(campaign.created_at)}</ListTableCell>
                            <ListTableCell>
                              <Badge variant="outline">
                                {campaign.target_type === 'all'
                                  ? 'All Users'
                                  : `Role: ${campaign.target_role}`}
                              </Badge>
                            </ListTableCell>
                            <ListTableCell align="right">{campaign.total_recipients}</ListTableCell>
                            <ListTableCell align="right">
                              <div className="flex items-center justify-end gap-2">
                                <span>{readRate}%</span>
                                <span className="text-xs text-muted">({campaign.read_count})</span>
                              </div>
                            </ListTableCell>
                          </ListTableRow>
                        );
                      })}
                    </ListTableBody>
                  </ListTable>
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
