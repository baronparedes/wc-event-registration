import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../Button';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the icon, title, and description correctly', () => {
    render(
      <EmptyState
        icon={<svg data-testid="mock-icon" />}
        title="No data found"
        description="There is no data to display at this time."
      />,
    );

    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByText('No data found')).toBeInTheDocument();
    expect(screen.getByText('There is no data to display at this time.')).toBeInTheDocument();
  });

  it('renders the optional action prop when provided', () => {
    render(
      <EmptyState
        icon={<span />}
        title="No data found"
        description="There is no data to display at this time."
        action={<Button>Create Item</Button>}
      />,
    );

    const button = screen.getByRole('button', { name: /create item/i });
    expect(button).toBeInTheDocument();
  });

  it('does not render the action container when action is not provided', () => {
    render(
      <EmptyState
        icon={<span />}
        title="No data found"
        description="There is no data to display at this time."
      />,
    );

    // Assert that the container for action is not rendered
    // Since we don't know the exact class, we can assert that a specific role or text meant to be action is not there,
    // or just the absence of buttons/links in our case.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('accepts and applies the className prop', () => {
    render(
      <EmptyState
        icon={<span />}
        title="No data found"
        description="There is no data to display at this time."
        className="custom-empty-class"
      />,
    );

    // Look for the main text container and assert that its parent has the class
    const titleElement = screen.getByText('No data found');
    expect(titleElement.parentElement).toHaveClass('custom-empty-class');
  });
});
