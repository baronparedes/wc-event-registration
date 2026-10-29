import { render, screen } from '@testing-library/react';

import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders correctly with default styles', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton-shimmer', 'rounded-md');
    expect(skeleton).toHaveAttribute('role', 'presentation');
  });

  it('merges custom className with default classes', () => {
    render(<Skeleton data-testid="skeleton" className="w-10 h-10 custom-class" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('skeleton-shimmer', 'rounded-md', 'w-10', 'h-10', 'custom-class');
  });

  it('passes additional props to the root element', () => {
    render(<Skeleton data-testid="skeleton" aria-label="loading" id="my-skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('aria-label', 'loading');
    expect(skeleton).toHaveAttribute('id', 'my-skeleton');
  });
});
