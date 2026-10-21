import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { MembersNavigationTabs } from '../MembersNavigationTabs';

describe('MembersNavigationTabs', () => {
  it('renders navigation links to directory and dashboard', () => {
    render(
      <MemoryRouter>
        <MembersNavigationTabs />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Directory/i })).toHaveAttribute(
      'href',
      '/admin/members',
    );
    expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute(
      'href',
      '/admin/members/dashboard',
    );
  });
});
