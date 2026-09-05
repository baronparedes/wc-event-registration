import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LEGAL_CONFIG } from '@/config/constants/legal';
import { TermsOfServicePage } from '@/pages/terms';

describe('TermsOfServicePage', () => {
  it('renders the Terms of Service header and organization details', () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(LEGAL_CONFIG.appName, 'i'))[0]).toBeInTheDocument();
  });

  it('renders essential terms sections', () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: '1. Acceptance of Terms' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '2. Description of Service' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '3. User Accounts & Responsibilities' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '4. Acceptable Use' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '5. Intellectual Property' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '6. Disclaimer of Warranties & Limitation of Liability',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '7. Changes to Terms' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '8. Contact Us' })).toBeInTheDocument();
  });

  it('displays contact email link', () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>,
    );

    const emailLink = screen.getByRole('link', { name: LEGAL_CONFIG.contactEmail });
    expect(emailLink).toHaveAttribute('href', `mailto:${LEGAL_CONFIG.contactEmail}`);
  });
});
