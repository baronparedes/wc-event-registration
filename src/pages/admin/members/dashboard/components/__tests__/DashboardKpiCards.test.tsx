import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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

    expect(screen.getByText('Average Age')).toBeInTheDocument();
    expect(screen.getByText('29.5 yrs')).toBeInTheDocument();
    expect(screen.getByText('40 of 50 records (80%)')).toBeInTheDocument();
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
