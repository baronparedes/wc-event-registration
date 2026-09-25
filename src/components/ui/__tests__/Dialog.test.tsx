import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from '@/components/ui/Dialog';

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog isOpen={false} onClose={vi.fn()}>
        <Dialog.Header>
          <Dialog.Title>Test Title</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>Test Body</Dialog.Body>
      </Dialog>,
    );

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('renders title, description, body, and footer when open', () => {
    render(
      <Dialog isOpen onClose={vi.fn()}>
        <Dialog.Header showCloseButton>
          <Dialog.Title>Test Title</Dialog.Title>
          <Dialog.Description>Test Description</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>Test Content</Dialog.Body>
        <Dialog.Footer>
          <button type="button">Action</button>
        </Dialog.Footer>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  it('calls onClose when clicking the close button in header', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen onClose={onClose}>
        <Dialog.Header showCloseButton>
          <Dialog.Title>Test Title</Dialog.Title>
        </Dialog.Header>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing Escape key by default', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen onClose={onClose}>
        <Dialog.Title>Test Title</Dialog.Title>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closeOnEscape is false', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen onClose={onClose} closeOnEscape={false}>
        <Dialog.Title>Test Title</Dialog.Title>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen onClose={onClose}>
        <Dialog.Title>Test Title</Dialog.Title>
      </Dialog>,
    );

    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the dialog card', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen onClose={onClose}>
        <Dialog.Title>Test Title</Dialog.Title>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body scroll when opened and restores on unmount', () => {
    const { unmount } = render(
      <Dialog isOpen onClose={vi.fn()}>
        <Dialog.Title>Test Title</Dialog.Title>
      </Dialog>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('applies custom size and maxWidthClass', () => {
    const { rerender } = render(
      <Dialog isOpen onClose={vi.fn()} size="3xl">
        <Dialog.Title>Test Title</Dialog.Title>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toHaveClass('max-w-3xl');

    rerender(
      <Dialog isOpen onClose={vi.fn()} maxWidthClass="max-w-7xl">
        <Dialog.Title>Test Title</Dialog.Title>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toHaveClass('max-w-7xl');
  });
});
