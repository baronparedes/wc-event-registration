import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttendanceFieldTypeSelector } from '@/pages/admin/events/[id]/attendance/fields/components/AttendanceFieldTypeSelector';

describe('AttendanceFieldTypeSelector', () => {
  it('renders all field types', () => {
    const onChange = vi.fn();
    render(<AttendanceFieldTypeSelector value="text" onChange={onChange} />);

    expect(screen.getByText('Single Line Text')).toBeInTheDocument();
    expect(screen.getByText('Multi-line Text')).toBeInTheDocument();
    expect(screen.getByText('Number')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Phone Number')).toBeInTheDocument();
    expect(screen.getByText('Dropdown List')).toBeInTheDocument();
    expect(screen.getByText('Radio Buttons')).toBeInTheDocument();
    expect(screen.getByText('Checkbox')).toBeInTheDocument();
    expect(screen.getByText('Checkboxes (Multiple)')).toBeInTheDocument();
    expect(screen.getByText('Checkboxes + Yes/No')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Date & Time')).toBeInTheDocument();
    expect(screen.getByText('Yes / No Toggle')).toBeInTheDocument();
  });

  it('highlights the selected type', () => {
    const onChange = vi.fn();
    render(<AttendanceFieldTypeSelector value="text" onChange={onChange} />);

    const textButton = screen.getByRole('button', { name: 'Single Line Text' });
    expect(textButton).toHaveClass(
      'border-primary',
      'bg-primary/10',
      'font-medium',
      'text-primary',
    );
  });

  it('does not highlight non-selected types', () => {
    const onChange = vi.fn();
    render(<AttendanceFieldTypeSelector value="text" onChange={onChange} />);

    const numberButton = screen.getByRole('button', { name: 'Number' });
    expect(numberButton).not.toHaveClass('border-primary');
    expect(numberButton).toHaveClass('border-border');
  });

  it('calls onChange with correct type when button is clicked', () => {
    const onChange = vi.fn();
    render(<AttendanceFieldTypeSelector value="text" onChange={onChange} />);

    const numberButton = screen.getByRole('button', { name: 'Number' });
    fireEvent.click(numberButton);

    expect(onChange).toHaveBeenCalledWith('number');
  });

  it('displays error message when provided', () => {
    const onChange = vi.fn();
    render(
      <AttendanceFieldTypeSelector
        value="text"
        onChange={onChange}
        error="Field type is required"
      />,
    );

    expect(screen.getByText('Field type is required')).toBeInTheDocument();
  });

  it('does not display error message when error is null', () => {
    const onChange = vi.fn();
    render(<AttendanceFieldTypeSelector value="text" onChange={onChange} error={null} />);

    expect(screen.queryByText(/Field type is required/)).not.toBeInTheDocument();
  });

  it('switches highlight when different type is selected', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<AttendanceFieldTypeSelector value="text" onChange={onChange} />);

    let textButton = screen.getByRole('button', { name: 'Single Line Text' });
    expect(textButton).toHaveClass('border-primary');

    rerender(<AttendanceFieldTypeSelector value="number" onChange={onChange} />);

    textButton = screen.getByRole('button', { name: 'Single Line Text' });
    const numberButton = screen.getByRole('button', { name: 'Number' });

    expect(textButton).not.toHaveClass('border-primary');
    expect(numberButton).toHaveClass('border-primary');
  });

  it('shows all field types in grid layout', () => {
    const onChange = vi.fn();
    const { container } = render(<AttendanceFieldTypeSelector value="text" onChange={onChange} />);

    const gridContainer = container.querySelector('[class*="grid"]');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('grid-cols-2', 'sm:grid-cols-3');
  });

  it('calls onChange with correct type for each field type button', () => {
    const onChange = vi.fn();
    render(<AttendanceFieldTypeSelector value="text" onChange={onChange} />);

    const textareaButton = screen.getByRole('button', { name: 'Multi-line Text' });
    fireEvent.click(textareaButton);
    expect(onChange).toHaveBeenCalledWith('textarea');

    const emailButton = screen.getByRole('button', { name: 'Email Address' });
    fireEvent.click(emailButton);
    expect(onChange).toHaveBeenCalledWith('email');

    const dateButton = screen.getByRole('button', { name: 'Date' });
    fireEvent.click(dateButton);
    expect(onChange).toHaveBeenCalledWith('date');
  });
});
