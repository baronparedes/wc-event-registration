import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/lib/infrastructure';

import { ErrorBoundary } from '../ErrorBoundary';

vi.mock('@/lib/infrastructure', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'boundary-test-uuid',
  },
});

function ThrowingComponent(): never {
  throw new Error('Child crashed during render');
}

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal Child Content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Normal Child Content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('catches render error, logs via logger, and renders ErrorFallbackCard', () => {
    // Suppress console.error during expected throw in React render
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Error details')).toBeInTheDocument();

    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('Child crashed during render');
    expect(pre?.textContent).toContain('boundary-test-uuid');

    expect(logger.error).toHaveBeenCalledWith(
      'React ErrorBoundary caught exception',
      expect.objectContaining({
        requestId: 'boundary-test-uuid',
        error: 'Child crashed during render',
      }),
    );

    consoleSpy.mockRestore();
  });
});
