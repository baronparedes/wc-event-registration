import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundPage } from '@/pages/not-found';

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

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates home and back from the 404 actions', () => {
    render(<NotFoundPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Go Home' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go Back' }));

    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, -1);
  });
});
