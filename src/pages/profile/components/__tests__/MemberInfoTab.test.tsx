import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';

import { MemberInfoTab } from '../MemberInfoTab';

describe('MemberInfoTab', () => {
  it('renders Personal Details and Sunday Availability, and omits Additional Information when metadata is empty', () => {
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
    expect(screen.getByText('555-1234')).toBeInTheDocument();
    expect(screen.getByText('May 15, 1990')).toBeInTheDocument();

    expect(screen.getByText('Sunday Availability')).toBeInTheDocument();
    expect(screen.queryByText('Additional Information')).not.toBeInTheDocument();
  });

  it('filters out sunday availability keys from Additional Information', () => {
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
    expect(screen.queryByText('Additional Information')).not.toBeInTheDocument();
  });

  it('renders Additional Information with title-cased keys for general metadata', () => {
    const member = makeAdminMember({
      extra_metadata: {
        first_sunday: '9AM',
        t_shirt_size: 'Large',
        dietary_restrictions: 'Vegetarian',
      },
    });

    render(<MemberInfoTab member={member} />);

    expect(screen.getByText('Sunday Availability')).toBeInTheDocument();
    expect(screen.getByText('Additional Information')).toBeInTheDocument();

    expect(screen.getByText('T Shirt Size')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();

    expect(screen.getByText('Dietary Restrictions')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
  });
});
