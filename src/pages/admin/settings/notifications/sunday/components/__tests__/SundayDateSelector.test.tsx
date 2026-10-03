import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SundayDateSelector } from '../SundayDateSelector';

describe('SundayDateSelector', () => {
  const mockOnDateChange = vi.fn();
  const mockOnResetToNearest = vi.fn();

  const defaultProps = {
    selectedDate: '2023-10-15',
    onDateChange: mockOnDateChange,
    onResetToNearest: mockOnResetToNearest,
    isNearest: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders target sunday information correctly', () => {
    render(<SundayDateSelector {...defaultProps} ordinal={3} sundayKey="third-sunday" />);

    expect(screen.getByText('Target Sunday')).toBeInTheDocument();
    expect(screen.getByText('3rd Sunday (third-sunday)')).toBeInTheDocument();
    expect(screen.getByText('Oct 15, 2023')).toBeInTheDocument();
  });

  it('calls onDateChange when previous button is clicked', async () => {
    const user = userEvent.setup();
    render(<SundayDateSelector {...defaultProps} />);

    const prevButton = screen.getByRole('button', { name: /previous sunday/i });
    await user.click(prevButton);

    expect(mockOnDateChange).toHaveBeenCalledWith('2023-10-08');
  });

  it('calls onDateChange when next button is clicked', async () => {
    const user = userEvent.setup();
    render(<SundayDateSelector {...defaultProps} />);

    const nextButton = screen.getByRole('button', { name: /next sunday/i });
    await user.click(nextButton);

    expect(mockOnDateChange).toHaveBeenCalledWith('2023-10-22');
  });

  it('calls onDateChange when input value changes', () => {
    render(<SundayDateSelector {...defaultProps} />);

    const dateInput = screen.getByDisplayValue('2023-10-15');
    fireEvent.change(dateInput, { target: { value: '2023-10-29' } });

    expect(mockOnDateChange).toHaveBeenCalledWith('2023-10-29');
  });

  it('calls onResetToNearest when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<SundayDateSelector {...defaultProps} />);

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    expect(mockOnResetToNearest).toHaveBeenCalled();
  });

  it('displays Nearest Upcoming badge and hides reset button when isNearest is true', () => {
    render(<SundayDateSelector {...defaultProps} isNearest={true} />);

    expect(screen.getByText('Nearest Upcoming')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('handles empty selectedDate correctly', async () => {
    const user = userEvent.setup();
    render(<SundayDateSelector {...defaultProps} selectedDate="" />);

    expect(screen.getByText('Select a Sunday to inspect and dispatch')).toBeInTheDocument();

    const prevButton = screen.getByRole('button', { name: /previous sunday/i });
    await user.click(prevButton);

    expect(mockOnDateChange).not.toHaveBeenCalled();
  });

  it('renders all ordinal suffixes correctly', () => {
    const { rerender } = render(<SundayDateSelector {...defaultProps} ordinal={1} />);
    expect(screen.getByText('1st Sunday ()')).toBeInTheDocument();

    rerender(<SundayDateSelector {...defaultProps} ordinal={2} />);
    expect(screen.getByText('2nd Sunday ()')).toBeInTheDocument();

    rerender(<SundayDateSelector {...defaultProps} ordinal={4} />);
    expect(screen.getByText('4th Sunday ()')).toBeInTheDocument();

    rerender(<SundayDateSelector {...defaultProps} ordinal={5} />);
    expect(screen.getByText('5th Sunday ()')).toBeInTheDocument();
  });
});
