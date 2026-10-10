import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spinner } from '../Spinner';

describe('Spinner', () => {
  it('renders with default accessibility role and label', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status', { name: 'Loading...' });
    expect(spinner).toBeInTheDocument();
    expect(spinner.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('renders with custom accessible label', () => {
    render(<Spinner label="Fetching data..." />);

    expect(screen.getByRole('status', { name: 'Fetching data...' })).toBeInTheDocument();
  });

  it('renders as decorative icon when aria-hidden is true', () => {
    const { container } = render(<Spinner aria-hidden="true" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    const span = container.querySelector('span[aria-hidden="true"]');
    expect(span).toBeInTheDocument();
    expect(span?.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('applies custom size classes and className', () => {
    render(<Spinner size="lg" className="text-primary" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-primary');
    expect(spinner.querySelector('svg')).toHaveClass('h-8', 'w-8');
  });
});
