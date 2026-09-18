import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminForm } from '@/lib/domain/forms';

import { DuplicateFormDialog } from '../DuplicateFormDialog';

describe('DuplicateFormDialog', () => {
  const mockForm = {
    id: 'form-1',
    title: 'Original Form',
  } as AdminForm;

  it('does not render when not open', () => {
    render(
      <DuplicateFormDialog
        isOpen={false}
        onClose={vi.fn()}
        form={mockForm}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders and auto-generates slug from title', async () => {
    render(
      <DuplicateFormDialog
        isOpen={true}
        onClose={vi.fn()}
        form={mockForm}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Duplicate Form' })).toBeInTheDocument();

    // Check initial title value
    const titleInput = screen.getByLabelText(/New Form Name/i);
    expect(titleInput).toHaveValue('Original Form (Copy)');

    // Slug should auto-generate
    const slugInput = screen.getByLabelText(/New Form Slug/i);
    await waitFor(() => {
      expect(slugInput).toHaveValue('original-form-copy');
    });

    // Change title and see if slug changes
    fireEvent.change(titleInput, { target: { value: 'My Awesome Duplicate Form' } });
    await waitFor(() => {
      expect(slugInput).toHaveValue('my-awesome-duplicate-form');
    });
  });

  it('calls onDuplicate with form values when submitted', async () => {
    const onDuplicateMock = vi.fn().mockResolvedValue(undefined);
    render(
      <DuplicateFormDialog
        isOpen={true}
        onClose={vi.fn()}
        form={mockForm}
        isPending={false}
        onDuplicate={onDuplicateMock}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: 'Duplicate Form' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onDuplicateMock).toHaveBeenCalledWith(
        'form-1',
        'Original Form (Copy)',
        'original-form-copy',
      );
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <DuplicateFormDialog
        isOpen={true}
        onClose={onCloseMock}
        form={mockForm}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
