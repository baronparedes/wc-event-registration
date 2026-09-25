import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AlertBanner } from '../AlertBanner';

describe('AlertBanner', () => {
  it('renders default info banner with title and description', () => {
    render(<AlertBanner title="Info Title" description="Here is some additional information." />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.getByText('Here is some additional information.')).toBeInTheDocument();
  });

  it('renders warning variant with children', () => {
    render(
      <AlertBanner variant="warning" title="Warning Heading">
        <p>Custom warning message body</p>
      </AlertBanner>,
    );

    expect(screen.getByText('Warning Heading')).toBeInTheDocument();
    expect(screen.getByText('Custom warning message body')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-amber-50');
  });

  it('renders error variant with action', () => {
    render(
      <AlertBanner
        variant="error"
        title="Failed to save"
        action={<button type="button">Retry</button>}
      />,
    );

    expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('hides icon when icon is false', () => {
    const { container } = render(<AlertBanner title="No Icon Alert" icon={false} />);

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
