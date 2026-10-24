import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders required icon, title, and description', () => {
    const icon = <span data-testid="test-icon">icon</span>;
    render(
      <EmptyState icon={icon} title="No Data Found" description="Try adjusting your filters" />,
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('No Data Found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('renders optional action node if provided', () => {
    const action = <button data-testid="test-action">Create Item</button>;
    render(
      <EmptyState icon={<span>icon</span>} title="No Data" description="None" action={action} />,
    );

    expect(screen.getByTestId('test-action')).toBeInTheDocument();
    expect(screen.getByText('Create Item')).toBeInTheDocument();
  });

  it('applies custom className to the wrapper div', () => {
    const { container } = render(
      <EmptyState
        icon={<span>icon</span>}
        title="No Data"
        description="None"
        className="custom-test-class"
      />,
    );

    // First child is the wrapper div
    expect(container.firstChild).toHaveClass('custom-test-class');
  });
});
