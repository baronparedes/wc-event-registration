import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StepIndicator } from '../StepIndicator';

describe('StepIndicator', () => {
  it('renders step count when labels are not provided', () => {
    render(<StepIndicator currentStep={2} totalSteps={3} />);

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders default category label when labels are provided', () => {
    render(
      <StepIndicator currentStep={1} totalSteps={3} labels={['Scan', 'Confirm', 'Complete']} />,
    );

    expect(screen.getByText('Registration steps')).toBeInTheDocument();
    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('renders custom category label when provided', () => {
    render(
      <StepIndicator
        currentStep={2}
        totalSteps={3}
        labels={['Lookup', 'Select', 'Confirm']}
        categoryLabel="Check-in steps"
      />,
    );

    expect(screen.getByText('Check-in steps')).toBeInTheDocument();
  });
});
