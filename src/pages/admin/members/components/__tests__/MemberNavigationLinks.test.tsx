import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { MemberNavigationLinks } from '../MemberNavigationLinks';

describe('MemberNavigationLinks', () => {
  it('renders links to Profile, Service Attendance, and Event History', () => {
    render(
      <MemoryRouter initialEntries={['/admin/members/m1']}>
        <MemberNavigationLinks memberId="m1" />
      </MemoryRouter>,
    );

    const profileLink = screen.getByRole('link', { name: 'Member Profile' });
    const serviceAttendanceLink = screen.getByRole('link', { name: 'Service Attendance' });
    const eventHistoryLink = screen.getByRole('link', { name: 'Event History' });

    expect(profileLink).toHaveAttribute('href', '/admin/members/m1');
    expect(serviceAttendanceLink).toHaveAttribute('href', '/admin/members/m1/service-attendance');
    expect(eventHistoryLink).toHaveAttribute('href', '/admin/members/m1/event-history');
  });
});
