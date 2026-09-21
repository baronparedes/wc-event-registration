import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorFallbackCard } from '../ErrorFallbackCard';

describe('ErrorFallbackCard', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        reload: vi.fn(),
        href: 'http://localhost/',
      },
    });
  });

  it('renders error title, message, and correlation request ID', () => {
    render(
      <ErrorFallbackCard
        requestId="req-12345"
        errorMessage="Database connection failed"
        errorStack="Error: Database connection failed\n    at test"
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Error details')).toBeInTheDocument();

    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('Request ID: req-12345');
    expect(pre?.textContent).toContain('Database connection failed');
    expect(pre?.textContent).toContain('Error: Database connection failed');
  });

  it('displays "No stack trace" when stack is omitted', () => {
    render(<ErrorFallbackCard requestId="req-67890" errorMessage="Unexpected null pointer" />);

    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('Request ID: req-67890');
    expect(pre?.textContent).toContain('Unexpected null pointer');
    expect(pre?.textContent).toContain('No stack trace');
  });

  it('reloads the page when "Refresh Page" is clicked', () => {
    render(<ErrorFallbackCard requestId="req-12345" errorMessage="Some error" />);

    fireEvent.click(screen.getByRole('button', { name: /refresh page/i }));
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('navigates to "/" when "Go Home" is clicked', () => {
    render(<ErrorFallbackCard requestId="req-12345" errorMessage="Some error" />);

    fireEvent.click(screen.getByRole('button', { name: /go home/i }));
    expect(window.location.href).toBe('/');
  });
});
