import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppFooter } from '@/components/layout/AppFooter';
import { LEGAL_CONFIG } from '@/config/constants/legal';
import { env } from '@/config/env';

vi.mock('@/config/env', () => ({
  env: {
    appVersion: undefined,
    appCommitHash: undefined,
  },
}));

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

  it('renders app version and commit hash when present', () => {
    vi.mocked(env).appVersion = '1.2.3';
    vi.mocked(env).appCommitHash = 'abc1234';

    render(
      <MemoryRouter>
        <AppFooter />
      </MemoryRouter>,
    );

    expect(screen.getByText(/v1\.2\.3 \(abc1234\)/)).toBeInTheDocument();
  });

  it('renders only app version when commit hash is absent', () => {
    vi.mocked(env).appVersion = '2.0.0';
    vi.mocked(env).appCommitHash = undefined;

    render(
      <MemoryRouter>
        <AppFooter />
      </MemoryRouter>,
    );

    expect(screen.getByText(/v2\.0\.0/)).toBeInTheDocument();
  });

  it('renders only commit hash when version is absent', () => {
    vi.mocked(env).appVersion = undefined;
    vi.mocked(env).appCommitHash = 'xyz9876';

    render(
      <MemoryRouter>
        <AppFooter />
      </MemoryRouter>,
    );

    expect(screen.getByText(/\(xyz9876\)/)).toBeInTheDocument();
  });
});
