import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RouteErrorBoundary } from '../RouteErrorBoundary';

// Mock the React Router hook
vi.mock('react-router-dom', () => ({
  useRouteError: vi.fn(() => new Error('Test routing error')),
}));

// Mock the crypto API since we run in HappyDOM environment
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234',
  },
});

describe('RouteErrorBoundary', () => {
  it('renders the error boundary UI and displays the error message', () => {
    act(() => {
      render(<RouteErrorBoundary />);
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Error details')).toBeInTheDocument();

    // The details are visually hidden initially, but DOM presence is enough for this test
    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('Test routing error');
    expect(pre?.textContent).toContain('test-uuid-1234');
  });
});
