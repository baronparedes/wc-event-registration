import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppFooter } from '@/components/layout/AppFooter';
import { LEGAL_CONFIG } from '@/config/constants/legal';

describe('AppFooter', () => {
  it('renders copyright and policy links', () => {
    render(
      <MemoryRouter>
        <AppFooter />
      </MemoryRouter>,
    );

    expect(screen.getByText(new RegExp(LEGAL_CONFIG.organizationName, 'i'))).toBeInTheDocument();

    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');

    const termsLink = screen.getByRole('link', { name: 'Terms of Service' });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');
  });
});
