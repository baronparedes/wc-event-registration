import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FormErrorSummary } from '../FormErrorSummary';

describe('FormErrorSummary', () => {
  it('renders default message when errorCount is 1', () => {
    render(<FormErrorSummary errorCount={1} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('1 required field needs attention before continuing.'),
    ).toBeInTheDocument();
  });

  it('renders pluralized message when errorCount is multiple', () => {
    render(<FormErrorSummary errorCount={4} />);

    expect(
      screen.getByText('4 required fields need attention before continuing.'),
    ).toBeInTheDocument();
  });

  it('renders custom title and description when provided', () => {
    render(
      <FormErrorSummary
        title="Custom survey error"
        description="Please answer all questions marked with an asterisk."
      />,
    );

    expect(screen.getByText('Custom survey error')).toBeInTheDocument();
    expect(
      screen.getByText('Please answer all questions marked with an asterisk.'),
    ).toBeInTheDocument();
  });

  it('does not render when errorCount is 0 or negative', () => {
    const { container: containerZero } = render(<FormErrorSummary errorCount={0} />);
    expect(containerZero).toBeEmptyDOMElement();

    const { container: containerNegative } = render(<FormErrorSummary errorCount={-1} />);
    expect(containerNegative).toBeEmptyDOMElement();
  });

  it('renders jump action button and triggers onJumpToFirstError on click', () => {
    const onJump = vi.fn();
    render(<FormErrorSummary errorCount={2} onJumpToFirstError={onJump} />);

    const jumpButton = screen.getByRole('button', { name: /jump to first error/i });
    expect(jumpButton).toBeInTheDocument();

    fireEvent.click(jumpButton);
    expect(onJump).toHaveBeenCalledTimes(1);
  });

  it('allows overriding actionLabel', () => {
    render(
      <FormErrorSummary
        errorCount={1}
        actionLabel="Review missing field"
        onJumpToFirstError={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /review missing field/i })).toBeInTheDocument();
  });
});
