import { forwardRef } from 'react';

import { Users } from 'lucide-react';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

interface VolunteerListTableProps {
  stats: CommitmentDashboardStat[];
  totalVolunteers: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  roles: string[];
  categories: string[];
  isLoading: boolean;
}

export const VolunteerListTable = forwardRef<HTMLDivElement, VolunteerListTableProps>(
  (
    {
      stats,
      totalVolunteers,
      searchQuery,
      onSearchChange,
      roleFilter,
      onRoleFilterChange,
      categoryFilter,
      onCategoryFilterChange,
      roles,
      categories,
      isLoading,
    },
    ref,
  ) => {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4 sm:px-6 sm:py-5">
          <div className="flex items-center space-x-2 text-base font-semibold text-foreground">
            <Users className="h-5 w-5" />
            <span>Volunteer List</span>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {totalVolunteers} volunteers
          </div>
        </div>

        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:px-6">
          <input
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search name or nickname..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <select
              className="w-full sm:w-[200px] flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
            >
              <option value="All Categories">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="w-full sm:w-[200px] flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
            >
              <option value="All Roles">All Roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Volunteer</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4 text-center">Committed</th>
                <th className="px-6 py-4 text-center">Attended</th>
                <th className="px-6 py-4 text-center">Absences</th>
                <th className="px-6 py-4 text-center">Excused</th>
                <th className="px-6 py-4 text-center">WI 9AM/3PM</th>
                <th className="px-6 py-4 text-center">WI 12NN</th>
                <th className="px-6 py-4 text-right">Attendance ↓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {stats.map((stat) => (
                <tr key={stat.user_id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-semibold text-foreground">{stat.full_name}</div>
                    <div className="text-xs text-muted-foreground">{stat.nickname}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-primary">{stat.role || '-'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-foreground">
                    {stat.category || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                    {stat.start_date || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-muted-foreground">
                    {stat.committed}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center font-medium text-emerald-600">
                    {stat.attended}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center font-medium text-rose-600">
                    {stat.absences}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-muted-foreground">
                    {stat.excused}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-muted-foreground">
                    {stat.wi_9am_3pm}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-muted-foreground">
                    {stat.wi_12nn}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-emerald-600">
                    {stat.attendance_score}
                  </td>
                </tr>
              ))}

              {stats.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">
                    No volunteers found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div ref={ref} className="h-4 w-full" />
        {isLoading && (
          <div className="flex justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    );
  },
);
