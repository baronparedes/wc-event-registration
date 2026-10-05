import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DynamicFieldTypeSelector } from '@/components/ui/DynamicFieldTypeSelector';

describe('DynamicFieldTypeSelector', () => {
  it('renders field type buttons for default events domain', () => {
    const onChange = vi.fn();
    render(<DynamicFieldTypeSelector value="text" onChange={onChange} />);

    expect(screen.getByRole('button', { name: /Single Line Text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rating$/i })).toBeInTheDocument();
  });

  it('renders domain-specific field types when domain is provided', () => {
    const onChange = vi.fn();
    render(<DynamicFieldTypeSelector value="text" onChange={onChange} domain="attendance" />);

    expect(screen.getByRole('button', { name: /Single Line Text/i })).toBeInTheDocument();
  });

  it('triggers onChange with the selected type when clicked', () => {
    const onChange = vi.fn();
    render(<DynamicFieldTypeSelector value="text" onChange={onChange} />);

    const ratingBtn = screen.getByRole('button', { name: /^Rating$/i });
    fireEvent.click(ratingBtn);

    expect(onChange).toHaveBeenCalledWith('rating');
  });

  it('highlights the currently selected field type', () => {
    render(<DynamicFieldTypeSelector value="rating" onChange={vi.fn()} />);

    const ratingBtn = screen.getByRole('button', { name: /^Rating$/i });
    expect(ratingBtn.className).toContain('border-primary');
  });

  it('disables buttons when disabled prop is true', () => {
    render(<DynamicFieldTypeSelector value="text" onChange={vi.fn()} disabled />);

    const textBtn = screen.getByRole('button', { name: /Single Line Text/i });
    expect(textBtn).toBeDisabled();
  });

  it('renders error message when error is provided', () => {
    render(
      <DynamicFieldTypeSelector value="text" onChange={vi.fn()} error="Field type is required" />,
    );

    expect(screen.getByText('Field type is required')).toBeInTheDocument();
  });
});
