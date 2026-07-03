import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SlugField } from '@/components/ui/SlugField';

describe('SlugField', () => {
  it('sanitizes and lowercases input in create mode', () => {
    const onChange = vi.fn();

    render(<SlugField isEditMode={false} value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'My Event@2026!' } });

    expect(onChange).toHaveBeenCalledWith('myevent2026');
    expect(
      screen.getByText(
        'Auto-generated from title. Use only lowercase letters, numbers, and hyphens.',
      ),
    ).toBeInTheDocument();
  });

  it('locks slug in edit mode and shows helper/adornment', () => {
    render(<SlugField isEditMode value="existing-slug" onChange={vi.fn()} />);

    expect(
      screen.getByText(
        'Slug cannot be changed after creation to preserve existing registration links.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('locked')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /slug/i })).toHaveAttribute('readonly');
  });
});
