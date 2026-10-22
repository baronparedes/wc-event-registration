import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { MembersNavigationTabs } from '../MembersNavigationTabs';

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MembersNavigationTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Directory and Dashboard tabs with Directory selected by default', () => {
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminMembers]}>
        <MembersNavigationTabs />
      </MemoryRouter>,
    );

    const directoryTab = screen.getByRole('tab', { name: /Directory/i });
    const dashboardTab = screen.getByRole('tab', { name: /Dashboard/i });

    expect(directoryTab).toHaveAttribute('aria-selected', 'true');
    expect(dashboardTab).toHaveAttribute('aria-selected', 'false');
  });

  it('selects Dashboard tab when on dashboard route', () => {
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminMembersDashboard]}>
        <MembersNavigationTabs />
      </MemoryRouter>,
    );

    const directoryTab = screen.getByRole('tab', { name: /Directory/i });
    const dashboardTab = screen.getByRole('tab', { name: /Dashboard/i });

    expect(directoryTab).toHaveAttribute('aria-selected', 'false');
    expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates to dashboard route when Dashboard tab is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminMembers]}>
        <MembersNavigationTabs />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('tab', { name: /Dashboard/i }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.adminMembersDashboard);
  });

  it('navigates to members directory route when Directory tab is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminMembersDashboard]}>
        <MembersNavigationTabs />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('tab', { name: /Directory/i }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.adminMembers);
  });
});
