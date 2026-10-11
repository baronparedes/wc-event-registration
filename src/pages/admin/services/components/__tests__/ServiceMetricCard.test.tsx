import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ServiceMetricCard, ServiceSlotCell } from '../ServiceMetricCard';

describe('ServiceMetricCard', () => {
  it('renders card title, subtitle, icon, badge and slot grid children', () => {
    render(
      <ServiceMetricCard
        icon={<span data-testid="test-icon">icon</span>}
        title="Test Metric"
        subtitle="Subtitle info"
        badgeContent="10 Total"
        badgeVariant="default"
      >
        <div data-testid="slot-child">Slot Content</div>
      </ServiceMetricCard>,
    );

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('Subtitle info')).toBeInTheDocument();
    expect(screen.getByText('10 Total')).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByTestId('slot-child')).toBeInTheDocument();
  });
});

describe('ServiceSlotCell', () => {
  it('renders static slot cell with value and sublabel', () => {
    render(<ServiceSlotCell timeSlot="9AM" value={15} sublabel="committed" />);

    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('committed')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders interactive button when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <ServiceSlotCell
        timeSlot="12NN"
        value={25}
        onClick={handleClick}
        title="Click to view 12NN"
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Click to view 12NN');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables interactive button when disabled is true', () => {
    const handleClick = vi.fn();
    render(<ServiceSlotCell timeSlot="3PM" value={0} onClick={handleClick} disabled />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('title');

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
