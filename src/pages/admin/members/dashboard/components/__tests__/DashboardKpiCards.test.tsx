import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MemberDashboardData } from '@/lib/domain/members';

import { DashboardKpiCards } from '../DashboardKpiCards';

describe('DashboardKpiCards', () => {
  const sampleData: MemberDashboardData = {
    totalActiveMembers: 50,
    roleDistributions: [],
    ageDemographics: {
      totalWithDob: 40,
      totalMembers: 50,
      averageAge: 29.5,
      medianAge: 28,
      coveragePercentage: 80,
      brackets: [],
    },
    commitmentHeatmap: {
      maxCount: 15,
      totalCommittedMembers: 30,
      sundays: [],
      timeSlots: [],
      slots: [],
    },
    dgroupAnalytics: {
      totalMembers: 50,
      inDGroupCount: 35,
      missingDGroupCount: 15,
      coveragePercentage: 70,
      dgroupLeaderCount: 5,
      dgroupMemberCount: 30,
      statusBreakdown: [],
      members: [],
    },
    inactivityAnalytics: {
      thresholdSundays: 13,
      inactiveCount: 8,
      percentage: 16,
      members: [],
    },
    vmtMigrationAnalytics: {
      totalMembers: 50,
      migratedCount: 35,
      missingCount: 15,
      missingBothCount: 10,
      missingIdOnlyCount: 3,
      missingDateOnlyCount: 2,
      migratedPercentage: 70,
      missingPercentage: 30,
      missingMembers: [],
    },
  };

  it('renders all KPI cards with formatted values and subtitles', () => {
    render(<DashboardKpiCards data={sampleData} />);

    expect(screen.getByText('Active Members')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();

    expect(screen.getByText('DGroup Participation')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();

    expect(screen.getByText('DGroup Leaders')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    expect(screen.getByText('Sunday Volunteers')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();

    expect(screen.getByText('Inactive Volunteers')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('> 13 Sundays · View list')).toBeInTheDocument();

    expect(screen.getByText('Missing CCF VMT')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('70% migrated · View list')).toBeInTheDocument();

    expect(screen.getByText('Average Age')).toBeInTheDocument();
    expect(screen.getByText('29.5 yrs')).toBeInTheDocument();
    expect(screen.getByText('40 of 50 records (80%)')).toBeInTheDocument();
  });

  it('invokes onInactiveVolunteersClick when Inactive Volunteers card is clicked', () => {
    const onInactiveClick = vi.fn();
    render(<DashboardKpiCards data={sampleData} onInactiveVolunteersClick={onInactiveClick} />);

    const inactiveCardButton = screen.getByRole('button', {
      name: /view 8 inactive volunteers/i,
    });
    fireEvent.click(inactiveCardButton);

    expect(onInactiveClick).toHaveBeenCalledTimes(1);
  });

  it('invokes onVmtMigrationClick when Missing CCF VMT card is clicked', () => {
    const onVmtClick = vi.fn();
    render(<DashboardKpiCards data={sampleData} onVmtMigrationClick={onVmtClick} />);

    const vmtCardButton = screen.getByRole('button', {
      name: /view 15 members missing ccf vmt data/i,
    });
    fireEvent.click(vmtCardButton);

    expect(onVmtClick).toHaveBeenCalledTimes(1);
  });

  it('renders fallback values when no birth dates are recorded', () => {
    const dataWithoutDob: MemberDashboardData = {
      ...sampleData,
      ageDemographics: {
        ...sampleData.ageDemographics,
        totalWithDob: 0,
        averageAge: null,
      },
    };

    render(<DashboardKpiCards data={dataWithoutDob} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('No DOB recorded')).toBeInTheDocument();
  });
});
