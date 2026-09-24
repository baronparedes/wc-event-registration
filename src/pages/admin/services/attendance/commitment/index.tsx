import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { endOfQuarter, endOfYear, format, startOfQuarter, startOfYear } from 'date-fns';

import { AdminPageShell } from '@/components/layout';
import { TIMING } from '@/config/constants';
import { env } from '@/config/env';
import { useCommitmentDashboardStatsQuery } from '@/hooks/domain/services';
import type { CommitmentDashboardStat } from '@/hooks/domain/services';
import { ServiceNavigationLinks } from '@/pages/admin/services/components';

import {
  CommitmentDashboardFilters,
  CommitmentSummaryCards,
  type DashboardTimeframe,
  ExportCommitmentDashboardButton,
  TopVolunteersChart,
  VolunteerAttendanceModal,
  VolunteerListTable,
} from './components';

const excuseEventId = env.excuseEventId;

export function AdminServiceAttendanceCommitmentPage() {
  const currentYear = new Date().getFullYear();
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>('YTD');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [selectedVolunteer, setSelectedVolunteer] = useState<CommitmentDashboardStat | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, TIMING.searchDebounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const { startDate, endDate } = useMemo(() => {
    const startOfCurrentYear = startOfYear(new Date(currentYear, 0, 1));
    const endOfCurrentYear = endOfYear(new Date(currentYear, 0, 1));

    switch (timeframe) {
      case 'Q1':
        return {
          startDate: format(startOfQuarter(new Date(currentYear, 0, 1)), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(new Date(currentYear, 0, 1)), 'yyyy-MM-dd'),
        };
      case 'Q2':
        return {
          startDate: format(startOfQuarter(new Date(currentYear, 3, 1)), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(new Date(currentYear, 3, 1)), 'yyyy-MM-dd'),
        };
      case 'Q3':
        return {
          startDate: format(startOfQuarter(new Date(currentYear, 6, 1)), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(new Date(currentYear, 6, 1)), 'yyyy-MM-dd'),
        };
      case 'Q4':
        return {
          startDate: format(startOfQuarter(new Date(currentYear, 9, 1)), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(new Date(currentYear, 9, 1)), 'yyyy-MM-dd'),
        };
      case 'YTD':
      default:
        return {
          startDate: format(startOfCurrentYear, 'yyyy-MM-dd'),
          endDate: format(endOfCurrentYear, 'yyyy-MM-dd'),
        };
    }
  }, [timeframe, currentYear]);

  const normalizedSearchQuery = useMemo(() => debouncedSearchQuery.trim(), [debouncedSearchQuery]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCommitmentDashboardStatsQuery({
      start_date: startDate,
      end_date: endDate,
      excuse_event_id: excuseEventId,
      search_query: normalizedSearchQuery || undefined,
      role: selectedRoles.length > 0 ? selectedRoles.join(',') : undefined,
      category: categoryFilter,
    });

  const exportFilters = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      excuse_event_id: excuseEventId,
      search_query: normalizedSearchQuery || undefined,
      role: selectedRoles.length > 0 ? selectedRoles.join(',') : undefined,
      category: categoryFilter,
      timeframe,
    }),
    [startDate, endDate, normalizedSearchQuery, selectedRoles, categoryFilter, timeframe],
  );

  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();

      if (node) {
        observerRef.current = new IntersectionObserver((entries) => {
          if (entries[0]?.isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        });
        observerRef.current.observe(node);
      }
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const stats = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const totalVolunteers = data?.pages[0]?.totalCount ?? 0;

  // We extract all unique roles and categories dynamically from the first page or from all stats loaded.
  // In a robust implementation, this could be a separate query. Here we deduce it from stats.
  const roles = useMemo(
    () => Array.from(new Set(stats.map((s) => s.role).filter(Boolean))),
    [stats],
  );
  const categories = useMemo(
    () => Array.from(new Set(stats.map((s) => s.category).filter(Boolean))),
    [stats],
  );

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Commitment Dashboard"
        description="Monitor volunteer commitment and attendance metrics."
        actions={<ExportCommitmentDashboardButton filters={exportFilters} disabled={isLoading} />}
        breadcrumbs={[{ label: 'Services', to: '/admin/services' }, { label: 'Commitment' }]}
      />
      <ServiceNavigationLinks />

      <AdminPageShell.Content className="mt-6 space-y-6">
        <CommitmentDashboardFilters
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          year={currentYear}
        />

        <CommitmentSummaryCards stats={stats} totalVolunteers={totalVolunteers} />

        <TopVolunteersChart stats={stats} />

        <VolunteerListTable
          ref={scrollRef}
          stats={stats}
          totalVolunteers={totalVolunteers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedRoles={selectedRoles}
          onSelectedRolesChange={setSelectedRoles}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          roles={roles}
          categories={categories}
          isLoading={isLoading || isFetchingNextPage}
          onRowClick={setSelectedVolunteer}
        />

        <VolunteerAttendanceModal
          isOpen={!!selectedVolunteer}
          onClose={() => setSelectedVolunteer(null)}
          volunteer={selectedVolunteer}
          timeframe={timeframe}
          startDate={startDate}
          endDate={endDate}
        />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
