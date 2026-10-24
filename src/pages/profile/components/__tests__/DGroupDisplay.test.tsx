import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DGroupDisplay } from '../DGroupDisplay';

describe('DGroupDisplay', () => {
  it('renders empty message when no dgroup metadata exists', () => {
    render(<DGroupDisplay metadata={{}} />);

    expect(screen.getByText('No discipleship group details recorded.')).toBeInTheDocument();
  });

  it('renders empty message when metadata is null or undefined', () => {
    render(<DGroupDisplay metadata={undefined} />);

    expect(screen.getByText('No discipleship group details recorded.')).toBeInTheDocument();
  });

  it('renders all 7 DGroup fields when populated', () => {
    const metadata = {
      dgroup_status: 'member',
      dgroup_member_since: '2023-09-01',
      dgroup_leader: 'Timothy',
      dgroup_leader_contact: '09181234567',
      dgroup_leader_email: 'timothy@example.com',
      dgroup_miner_open_schedule: 'Fridays 7:30PM',
      dgroup_miner_open_slots: '3',
    };

    render(<DGroupDisplay metadata={metadata} />);

    expect(screen.getByText('DGroup Status')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();

    expect(screen.getByText('Member Since')).toBeInTheDocument();
    expect(screen.getByText('Sep-23')).toBeInTheDocument();

    expect(screen.getByText('DGroup Leader')).toBeInTheDocument();
    expect(screen.getByText('Timothy')).toBeInTheDocument();

    expect(screen.getByText('Leader Contact')).toBeInTheDocument();
    expect(screen.getByText('09181234567')).toBeInTheDocument();

    expect(screen.getByText('Leader Email')).toBeInTheDocument();
    const emailLink = screen.getByRole('link', { name: 'timothy@example.com' });
    expect(emailLink).toHaveAttribute('href', 'mailto:timothy@example.com');

    expect(screen.getByText('Miner Open Schedule')).toBeInTheDocument();
    expect(screen.getByText('Fridays 7:30PM')).toBeInTheDocument();

    expect(screen.getByText('Miner Open Slots')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders Leader badge when status is leader', () => {
    render(<DGroupDisplay metadata={{ dgroup_status: 'leader' }} />);

    expect(screen.getByText('Leader')).toBeInTheDocument();
  });
});
