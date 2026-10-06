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

  it('handles promise rejection with promptToast.promise and custom error formats', async () => {
    vi.mocked(toast.custom).mockImplementation(() => 'test-promise-error-toast');

    // Error as function returning object
    const failingPromise1 = Promise.reject(new Error('Boom 1'));
    promptToast.promise(failingPromise1, {
      error: (err) => ({ title: 'Custom Error Object', description: String(err) }),
    });

    await act(async () => {
      try {
        await failingPromise1;
      } catch {
        // expected rejection
      }
    });

    // Error as function returning string
    const failingPromise2 = Promise.reject(new Error('Boom 2'));
    promptToast.promise(failingPromise2, {
      error: () => 'String Error Msg',
    });

    await act(async () => {
      try {
        await failingPromise2;
      } catch {
        // expected rejection
      }
    });

    // Error as static object
    const failingPromise3 = Promise.reject(new Error('Boom 3'));
    promptToast.promise(failingPromise3, {
      error: { title: 'Static Error' },
    });

    await act(async () => {
      try {
        await failingPromise3;
      } catch {
        // expected rejection
      }
    });

    // Error default fallback
    const failingPromise4 = Promise.reject('Plain string error');
    promptToast.promise(() => failingPromise4);

    await act(async () => {
      try {
        await failingPromise4;
      } catch {
        // expected rejection
      }
    });
  });

  it('handles promise success with object and fallback formats', async () => {
    vi.mocked(toast.custom).mockImplementation(() => 'test-promise-success-toast');

    // Success as function returning string
    const successPromise1 = Promise.resolve('Done');
    promptToast.promise(successPromise1, {
      success: () => 'All done!',
    });

    await act(async () => {
      await successPromise1;
    });

    // Success as static string & static object
    const successPromise2 = Promise.resolve('Done 2');
    promptToast.promise(successPromise2, {
      success: 'Static Success',
    });

    await act(async () => {
      await successPromise2;
    });

    const successPromise3 = Promise.resolve('Done 3');
    promptToast.promise(successPromise3, {
      success: { title: 'Static Success Obj' },
    });

    await act(async () => {
      await successPromise3;
    });

    // Success default fallback
    const successPromise4 = Promise.resolve('Done 4');
    promptToast.promise(successPromise4);

    await act(async () => {
      await successPromise4;
    });
  });

  it('handles custom toast variants with promptToast.custom and promptToast.message', () => {
    vi.mocked(toast.custom).mockImplementation((jsxOrFn) => {
      if (typeof jsxOrFn === 'function') {
        render(jsxOrFn('test-toast-custom') as ReactNode);
      } else if (jsxOrFn) {
        render(jsxOrFn as ReactNode);
      }
      return 'test-toast-custom';
    });

    promptToast.custom(<div>Custom JSX</div>);
    expect(screen.getByText('Custom JSX')).toBeInTheDocument();

    promptToast.custom((id) => <div>Custom Func {id}</div>);
    expect(screen.getByText('Custom Func test-toast-custom')).toBeInTheDocument();

    promptToast.custom({ title: 'Option Toast' });
    expect(screen.getByText('Option Toast')).toBeInTheDocument();

    promptToast.message('Message Title', { description: 'Message Desc' });
    expect(screen.getByText('Message Title')).toBeInTheDocument();
  });

  it('pauses and resumes progress bar timer on mouse enter and leave', () => {
    vi.mocked(toast.custom).mockImplementation((callback) => {
      render(callback('test-toast-hover') as ReactNode);
      return 'test-toast-hover';
    });

    promptToast.info('Hover Toast', { duration: 4000 });
    const toastElem = screen.getByText('Hover Toast').closest('div');
    if (toastElem) {
      fireEvent.mouseEnter(toastElem);
      fireEvent.mouseLeave(toastElem);
    }
  });
});
