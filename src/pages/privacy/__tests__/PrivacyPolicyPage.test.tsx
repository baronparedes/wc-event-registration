import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LEGAL_CONFIG } from '@/config/constants/legal';
import { PrivacyPolicyPage } from '@/pages/privacy';

describe('PrivacyPolicyPage', () => {
  it('renders the Privacy Policy header and organization name', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(LEGAL_CONFIG.appName, 'i'))[0]).toBeInTheDocument();
  });

  it('renders key Google OAuth privacy compliance sections', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 2, name: '1. Introduction' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '2. Information We Collect' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '3. How We Use Your Information' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '4. Google User Data & OAuth Scopes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '5. Sharing & Disclosure of Information' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '6. Data Security & Retention' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '7. Your Rights' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '8. Contact Us' })).toBeInTheDocument();
  });

  it('displays contact email link', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );

    const emailLink = screen.getByRole('link', { name: LEGAL_CONFIG.contactEmail });
    expect(emailLink).toHaveAttribute('href', `mailto:${LEGAL_CONFIG.contactEmail}`);
  });
});
