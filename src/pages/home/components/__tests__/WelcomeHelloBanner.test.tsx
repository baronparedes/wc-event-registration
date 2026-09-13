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

  it('renders heading, description, badge, and button', () => {
    render(<WelcomeHelloBanner />);

    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Discover who we are, our mission and vision, core values, and our discipleship journey/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Hello Guide/i })).toBeInTheDocument();
    expect(screen.getByAltText('CCF Hello Brochure Preview')).toBeInTheDocument();
  });

  it('navigates to /hello when button is clicked', () => {
    render(<WelcomeHelloBanner />);

    const button = screen.getByRole('button', { name: /Explore Hello Guide/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.hello);
  });

  it('navigates to /hello when the entire card banner is clicked', () => {
    render(<WelcomeHelloBanner />);

    const banner = screen.getByRole('region', { name: /Welcome to CCF Hello Brochure Banner/i });
    fireEvent.click(banner);

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.hello);
  });
});
