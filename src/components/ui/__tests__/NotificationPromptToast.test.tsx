import type { ReactNode } from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { promptToast, showPromptToast } from '../NotificationPromptToast';

vi.mock('sonner', () => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('NotificationPromptToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls toast.custom with custom rendered NotificationPrompt and default options', () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-1') as ReactNode);
      return 'test-toast-1';
    });

    const toastId = showPromptToast({
      title: 'Item Created',
      description: 'Your item was created successfully.',
    });

    expect(toastId).toBe('test-toast-1');
    expect(toast.custom).toHaveBeenCalled();
    expect(screen.getByText('Item Created')).toBeInTheDocument();
    expect(screen.getByText('Your item was created successfully.')).toBeInTheDocument();
  });

  it('renders actions and handles cancel/action clicks correctly', async () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-actions') as ReactNode);
      return 'test-toast-actions';
    });

    const mockAction = vi.fn();
    const mockCancel = vi.fn();

    promptToast.success('Update available', {
      description: 'A new version is ready.',
      action: {
        label: 'Update now',
        onClick: mockAction,
      },
      cancel: {
        label: 'Later',
        onClick: mockCancel,
      },
    });

    const updateBtn = screen.getByRole('button', { name: /Update now/i });
    const cancelBtn = screen.getByRole('button', { name: /Later/i });

    expect(updateBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(updateBtn);
    });
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(toast.dismiss).toHaveBeenCalledWith('test-toast-actions');

    fireEvent.click(cancelBtn);
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('handles dismiss button click in toast', () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-dismiss') as ReactNode);
      return 'test-toast-dismiss';
    });

    const mockOnDismiss = vi.fn();

    promptToast.error('Failed to sync', {
      onDismiss: mockOnDismiss,
    });

    const closeBtn = screen.getByRole('button', { name: /Dismiss notification/i });
    fireEvent.click(closeBtn);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    expect(toast.dismiss).toHaveBeenCalledWith('test-toast-dismiss');
  });

  it('supports helper methods promptToast.warning, promptToast.info, and promptToast.dismiss', () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-variants') as ReactNode);
      return 'test-toast-variants';
    });

    promptToast.warning('Warning message');
    expect(screen.getByText('Warning message')).toBeInTheDocument();

    promptToast.info('Info message');
    expect(screen.getByText('Info message')).toBeInTheDocument();

    promptToast.dismiss('test-toast-variants');
    expect(toast.dismiss).toHaveBeenCalledWith('test-toast-variants');
  });

  it('supports promptToast.loading and renders without dismiss button', () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-loading') as ReactNode);
      return 'test-toast-loading';
    });

    promptToast.loading('Processing registration...');
    expect(screen.getByText('Processing registration...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss notification/i })).not.toBeInTheDocument();
  });

  it('handles Error objects and formats title message correctly', () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-error-obj') as ReactNode);
      return 'test-toast-error-obj';
    });

    promptToast.error(new Error('Network disconnected'));
    expect(screen.getByText('Network disconnected')).toBeInTheDocument();
  });

  it('handles promise lifecycle with promptToast.promise', async () => {
    vi.mocked(toast.custom).mockImplementation(() => {
      return 'test-promise-toast';
    });

    const successPromise = Promise.resolve({ count: 5 });
    const onFinally = vi.fn();

    promptToast.promise(successPromise, {
      loading: 'Saving...',
      success: (data) => `Saved ${data.count} items!`,
      error: 'Failed to save',
      finally: onFinally,
    });

    expect(toast.custom).toHaveBeenCalled();

    await act(async () => {
      await successPromise;
    });

    expect(toast.custom).toHaveBeenCalledTimes(2);
    expect(onFinally).toHaveBeenCalledTimes(1);
  });

  it('renders progress bar for standard toasts with duration', () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-progress') as ReactNode);
      return 'test-toast-progress';
    });

    promptToast.success('Saved successfully', { duration: 5000 });
    expect(screen.getByTestId('toast-progress-bar')).toBeInTheDocument();
  });

  it('suppresses progress bar for loading toasts', () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-loading-progress') as ReactNode);
      return 'test-toast-loading-progress';
    });

    promptToast.loading('Uploading...', { duration: 5000 });
    expect(screen.queryByTestId('toast-progress-bar')).not.toBeInTheDocument();
  });
});
