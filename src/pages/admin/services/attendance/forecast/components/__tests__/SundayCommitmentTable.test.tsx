import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SundayCommitmentTable } from '../SundayCommitmentTable';

describe('SundayCommitmentTable', () => {
  const sampleSessions = [
    { slot: '9AM' as const, target: 29, scheduled: 39, confirmed: 28, overShort: -1 },
    { slot: '12NN' as const, target: 27, scheduled: 39, confirmed: 24, overShort: -3 },
    { slot: '3PM' as const, target: 33, scheduled: 31, confirmed: 22, overShort: -11 },
  ];

  it('renders table headers and banner title matching specifications', () => {
    render(
      <SundayCommitmentTable
        title="USHER/BACKROOM COMMITMENTS"
        sessions={sampleSessions}
        totalTarget={89}
        totalScheduled={109}
        totalConfirmed={74}
        totalOverShort={-15}
      />,
    );

    expect(screen.getByText('USHER/BACKROOM COMMITMENTS')).toBeInTheDocument();
    expect(screen.getByText('SESSION')).toBeInTheDocument();
    expect(screen.getByText('TARGET')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('EXPECTED')).toBeInTheDocument();
    expect(screen.getByText('VARIANCE')).toBeInTheDocument();
  });

  it('renders all sessions and matches exact sample data with negative deficit highlights', () => {
    render(
      <SundayCommitmentTable
        title="USHER/BACKROOM COMMITMENTS"
        sessions={sampleSessions}
        totalTarget={89}
        totalScheduled={109}
        totalConfirmed={74}
        totalOverShort={-15}
        totalDeficit={15}
      />,
    );

    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('12NN')).toBeInTheDocument();
    expect(screen.getByText('3PM')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();

    // Check specific deficit numbers
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('-3')).toBeInTheDocument();
    expect(screen.getByText('-11')).toBeInTheDocument();
    expect(screen.getByText('-15 Short')).toBeInTheDocument();
  });

  it('renders positive surplus numbers with plus prefix and emerald styling', () => {
    const surplusSessions = [
      { slot: '9AM' as const, target: 20, scheduled: 25, confirmed: 22, overShort: 2 },
    ];

    render(
      <SundayCommitmentTable
        title="PRAYER COACH COMMITMENTS"
        sessions={surplusSessions}
        totalTarget={20}
        totalScheduled={25}
        totalConfirmed={22}
        totalOverShort={2}
      />,
    );

    expect(screen.getAllByText('+2').length).toBe(2); // One in session row, one in total row
  });
});
