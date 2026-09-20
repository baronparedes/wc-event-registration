import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { WelcomeHelloBanner } from '../WelcomeHelloBanner';

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('WelcomeHelloBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brochure preview and badge', () => {
    render(<WelcomeHelloBanner />);

    expect(screen.getByAltText('CCF Hello Brochure Preview')).toBeInTheDocument();
    expect(screen.getByText('8 Interactive Slides')).toBeInTheDocument();
    expect(screen.getByText('Explore →')).toBeInTheDocument();
  });

  it('navigates to /hello when the banner is clicked', () => {
    render(<WelcomeHelloBanner />);

    const banner = screen.getByRole('region', { name: /Welcome to CCF Hello Brochure Banner/i });
    fireEvent.click(banner);

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.hello);
  });

  it('hides the center graphic but keeps explore controls when translucentBackground is true', () => {
    render(<WelcomeHelloBanner translucentBackground />);

    expect(screen.queryByAltText('CCF Hello Brochure Preview')).not.toBeInTheDocument();
    expect(screen.getByText('8 Interactive Slides')).toBeInTheDocument();
    expect(screen.getByText('Explore →')).toBeInTheDocument();
  });
});
