import { forwardRef, useMemo, useState } from 'react';

import { ArrowDown, ArrowUp, ArrowUpDown, Users } from 'lucide-react';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

export type VolunteerSortField =
  | 'full_name'
  | 'role'
  | 'category'
  | 'start_date'
  | 'committed'
  | 'attended'
  | 'absences'
  | 'excused'
  | 'wi_9am_3pm'
  | 'wi_12nn'
  | 'attendance_score';

export type SortOrder = 'asc' | 'desc';

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
    const [sortBy, setSortBy] = useState<VolunteerSortField>('attendance_score');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const handleSort = (field: VolunteerSortField) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        const isText = ['full_name', 'role', 'category', 'start_date'].includes(field);
        setSortOrder(isText ? 'asc' : 'desc');
      }
    };

    const sortedStats = useMemo(() => {
      return [...stats].sort((a, b) => {
        let comparison: number;
        switch (sortBy) {
          case 'full_name':
            comparison = a.full_name.localeCompare(b.full_name);
            break;
          case 'role':
            comparison = (a.role || '').localeCompare(b.role || '');
            break;
          case 'category':
            comparison = (a.category || '').localeCompare(b.category || '');
            break;
          case 'start_date':
            comparison = (a.start_date || '').localeCompare(b.start_date || '');
            break;
          case 'committed':
            comparison = a.committed - b.committed;
            break;
          case 'attended':
            comparison = a.attended - b.attended;
            break;
          case 'absences':
            comparison = a.absences - b.absences;
            break;
          case 'excused':
            comparison = a.excused - b.excused;
            break;
          case 'wi_9am_3pm':
            comparison = a.wi_9am_3pm - b.wi_9am_3pm;
            break;
          case 'wi_12nn':
            comparison = a.wi_12nn - b.wi_12nn;
            break;
          case 'attendance_score':
          default:
            comparison = a.attendance_score - b.attendance_score;
            break;
        }

        if (comparison === 0) {
          return a.full_name.localeCompare(b.full_name);
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }, [stats, sortBy, sortOrder]);

    const renderSortIcon = (field: VolunteerSortField) => {
      if (sortBy === field) {
        return sortOrder === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-primary" />
        );
      }
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100" />;
    };

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
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('full_name')}
                    className="group inline-flex items-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>Volunteer</span>
                    {renderSortIcon('full_name')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('role')}
                    className="group inline-flex items-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>Role</span>
                    {renderSortIcon('role')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('category')}
                    className="group inline-flex items-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>Category</span>
                    {renderSortIcon('category')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort('start_date')}
                    className="group inline-flex items-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>Start Date</span>
                    {renderSortIcon('start_date')}
                  </button>
                </th>
                <th className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('committed')}
                    className="group inline-flex items-center justify-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>Committed</span>
                    {renderSortIcon('committed')}
                  </button>
                </th>
                <th className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('attended')}
                    className="group inline-flex items-center justify-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>Attended</span>
                    {renderSortIcon('attended')}
                  </button>
                </th>
                <th className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('absences')}
                    className="group inline-flex items-center justify-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>Absences</span>
                    {renderSortIcon('absences')}
                  </button>
                </th>
                <th className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('excused')}
                    className="group inline-flex items-center justify-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>Excused</span>
                    {renderSortIcon('excused')}
                  </button>
                </th>
                <th className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('wi_9am_3pm')}
                    className="group inline-flex items-center justify-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>WI 9AM/3PM</span>
                    {renderSortIcon('wi_9am_3pm')}
                  </button>
                </th>
                <th className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('wi_12nn')}
                    className="group inline-flex items-center justify-center gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    <span>WI 12NN</span>
                    {renderSortIcon('wi_12nn')}
                  </button>
                </th>
                <th className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('attendance_score')}
                    className="group inline-flex items-center justify-end gap-1 font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors focus:outline-none ml-auto"
                  >
                    <span>Attendance</span>
                    {renderSortIcon('attendance_score')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {sortedStats.map((stat) => (
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

              {sortedStats.length === 0 && !isLoading && (
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
