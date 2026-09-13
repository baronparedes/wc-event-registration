import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FormConfirmationStepCard } from '../FormConfirmationStepCard';

describe('FormConfirmationStepCard', () => {
  it('renders submitted status and triggers action buttons', () => {
    const onReset = vi.fn();
    const onGoHome = vi.fn();

    render(
      <FormConfirmationStepCard
        submissionId="sub-123"
        status="submitted"
        onReset={onReset}
        onGoHome={onGoHome}
      />,
    );

    expect(screen.getByText('Form Submitted!')).toBeInTheDocument();
    expect(screen.getByText('sub-123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Another Response' }));
    expect(onReset).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Go Home' }));
    expect(onGoHome).toHaveBeenCalled();
  });

  it('renders updated status heading when status is updated', () => {
    render(
      <FormConfirmationStepCard
        submissionId="sub-456"
        status="updated"
        onReset={vi.fn()}
        onGoHome={vi.fn()}
      />,
    );

    expect(screen.getByText('Submission Updated!')).toBeInTheDocument();
  });
});
