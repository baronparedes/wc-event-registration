import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('renders vertical layout with message and spinner', () => {
    const { container } = render(<LoadingState message="Loading members..." />);

    expect(screen.getByText('Loading members...')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders horizontal layout when specified', () => {
    const { container } = render(<LoadingState layout="horizontal" message="Processing..." />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders accessible status role when no message is provided', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
