import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommunityWelcome } from '../CommunityWelcome';

const { mockUseCurrentProfileQuery } = vi.hoisted(() => ({
  mockUseCurrentProfileQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <CommunityWelcome />
    </MemoryRouter>,
  );
}

describe('CommunityWelcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Sign In ->" when user is not signed in', () => {
    mockUseCurrentProfileQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });

    renderComponent();

    const link = screen.getByRole('link', { name: 'Sign In \u2192' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/profile');
    expect(
      screen.getByText('Sign in to see your profile, commitments, attendance, and events joined.'),
    ).toBeInTheDocument();
  });

  it('renders "My Profile ->" when user is signed in and verified', () => {
    mockUseCurrentProfileQuery.mockReturnValue({
      data: {
        id: 'member-123',
        member_id: 'MEM-123',
        full_name: 'Test Member',
      },
      isLoading: false,
    });

    renderComponent();

    const link = screen.getByRole('link', { name: 'My Profile \u2192' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/profile');
    expect(
      screen.getByText('View your profile, commitments, attendance, and events joined.'),
    ).toBeInTheDocument();
  });
});
