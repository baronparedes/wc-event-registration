import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { UserIdentity } from '@/components/layout/UserIdentity';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: () => <span data-testid="avatar" />,
}));

function renderUserIdentity(props: Parameters<typeof UserIdentity>[0]) {
  return render(
    <MemoryRouter>
      <UserIdentity {...props} />
    </MemoryRouter>,
  );
}

describe('UserIdentity', () => {
  it('renders a profile link and invokes the click handler when access is available', () => {
    const onProfileClick = vi.fn();

    renderUserIdentity({
      displayName: 'Test Member',
      roleLabel: '(Admin)',
      hasProfileAccess: true,
      onProfileClick,
    });

    const profileLink = screen.getByRole('link', { name: /Test Member \(Admin\)/ });
    expect(profileLink).toHaveAttribute('href', '/profile');
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.getByText('(Admin)')).toHaveClass('block', 'text-[10px]', 'text-muted');

    fireEvent.click(profileLink);

    expect(onProfileClick).toHaveBeenCalledOnce();
  });

  it('renders a non-link identity when profile access is unavailable', () => {
    renderUserIdentity({
      displayName: 'Test Member',
      hasProfileAccess: false,
    });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Test Member')).toBeInTheDocument();
  });

  it('renders a non-link identity when the minimized shell disables profile navigation', () => {
    renderUserIdentity({
      displayName: 'Test Member',
      hasProfileAccess: true,
      disableLink: true,
    });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Test Member')).toBeInTheDocument();
  });

  it('supports drawer presentation and hiding the name label', () => {
    const { container } = renderUserIdentity({
      displayName: 'Test Member',
      roleLabel: '(Staff)',
      hasProfileAccess: false,
      variant: 'drawer',
      showNameLabel: false,
    });

    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.queryByText('Test Member')).not.toBeInTheDocument();
    expect(screen.queryByText('(Staff)')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass('gap-2.5', 'rounded-lg');
  });
});
