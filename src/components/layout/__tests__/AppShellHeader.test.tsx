import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppShellHeader } from '../AppShellHeader';

describe('AppShellHeader', () => {
  const userName = faker.person.fullName();

  it('renders the standard shell header with the brand and menu button', () => {
    render(
      <AppShellHeader
        isMinimizedShell={false}
        userBadge={<span>{userName}</span>}
        onOpenDrawer={vi.fn()}
      />,
    );

    expect(screen.getByAltText('Welcome Hub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open app navigation drawer' })).toBeInTheDocument();
    expect(screen.getByText(userName)).toBeInTheDocument();
  });

  it('renders the minimized shell as a combined compact menu trigger', () => {
    render(
      <AppShellHeader
        isMinimizedShell={true}
        userBadge={<span>{userName}</span>}
        onOpenDrawer={vi.fn()}
      />,
    );

    const menuButton = screen.getByRole('button', { name: 'Open app navigation drawer' });
    expect(menuButton).toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText(userName)).toBeInTheDocument();
  });
});
