import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';

import { MemberInfoTab } from '../MemberInfoTab';

describe('MemberInfoTab', () => {
  it('renders Personal Details and Sunday Availability', () => {
    const member = makeAdminMember({
      member_id: 'MEM-001',
      email: 'alex@example.com',
      phone: '555-1234',
      date_of_birth: '1990-05-15',
      extra_metadata: {},
    });

    render(<MemberInfoTab member={member} />);

    expect(screen.getByRole('heading', { name: 'Personal Details' })).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com').closest('div')).toHaveClass(
      'col-span-2',
      'md:col-span-1',
    );
    expect(screen.getByText('555-1234')).toBeInTheDocument();
    expect(screen.getByText('May 15, 1990')).toBeInTheDocument();

    expect(screen.getByText('Sunday Availability')).toBeInTheDocument();
  });

  it('renders Sunday Availability with slots when sunday metadata is present', () => {
    const member = makeAdminMember({
      extra_metadata: {
        first_sunday: '9AM',
        second_sunday: '12NN',
        third_sunday: '3PM',
        fourth_sunday: '9AM',
        fifth_sunday: '12NN',
      },
    });

    render(<MemberInfoTab member={member} />);

    expect(screen.getByText('Sunday Availability')).toBeInTheDocument();
  });

  it('promotes Civil Status, DGroup Leader, DGroup Status, and DGroup Member Since to Personal Details', () => {
    const member = makeAdminMember({
      extra_metadata: {
        civil_status: 'Married',
        dgroup_leader: 'Jane Smith',
        dgroup_status: 'Active',
        dgroup_member_since: '2020',
      },
    });

    render(<MemberInfoTab member={member} />);

    // Promoted under Personal Details
    expect(screen.getByText('Civil Status')).toBeInTheDocument();
    expect(screen.getByText('Married')).toBeInTheDocument();

    expect(screen.getByText('DGroup Leader')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    expect(screen.getByText('DGroup Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    expect(screen.getByText('DGroup Member Since')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });
});
