import type { ComponentProps } from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BroadcastDraftAiModal } from '../BroadcastDraftAiModal';

const { mockMutate } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
}));

let mockHookReturn: {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  triggerSuccessOnMutate: boolean;
} = {
  isPending: false,
  isError: false,
  error: null,
  triggerSuccessOnMutate: true,
};

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/domain/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/domain/notifications')>();
  return {
    ...actual,
    useBroadcastDraftAi: (options?: {
      onSuccess?: (data: {
        draft: {
          title: string;
          message: string;
        };
      }) => void;
      onError?: (err: Error) => void;
    }) => ({
      mutate: (payload: unknown) => {
        mockMutate(payload);
        if (mockHookReturn.triggerSuccessOnMutate) {
          options?.onSuccess?.({
            draft: {
              title: 'Sunday Usher Alert',
              message: 'Report at 8:15 AM for prayer.',
            },
          });
        } else if (mockHookReturn.isError && mockHookReturn.error) {
          options?.onError?.(mockHookReturn.error);
        }
      },
      isPending: mockHookReturn.isPending,
      isError: mockHookReturn.isError,
      error: mockHookReturn.error,
    }),
  };
});

describe('BroadcastDraftAiModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn = {
      isPending: false,
      isError: false,
      error: null,
      triggerSuccessOnMutate: true,
    };

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderModal = (props: Partial<ComponentProps<typeof BroadcastDraftAiModal>> = {}) =>
    render(
      <BroadcastDraftAiModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        currentTitle="Initial Title"
        currentMessage="Initial Message"
        {...props}
      />,
    );

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header, mode selector, tone selector, and textarea', () => {
    renderModal();

    expect(screen.getByText('AI Broadcast Assistant')).toBeInTheDocument();
    expect(screen.getByText('Draft from Notes')).toBeInTheDocument();
    expect(screen.getByText('Polish Existing')).toBeInTheDocument();
    expect(screen.getByText('Pastoral & Warm')).toBeInTheDocument();
    expect(screen.getByText('Urgent & Direct')).toBeInTheDocument();
    expect(screen.getByText('Informative & Clear')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate draft/i })).toBeInTheDocument();
  });

  it('prefills notes with current form values when switching to polish mode', () => {
    renderModal({
      currentTitle: 'Sunday Call Time',
      currentMessage: 'All ushers report by 8:30 AM.',
    });

    fireEvent.click(screen.getByText('Polish Existing'));

    const textarea = screen.getByLabelText('Existing Draft to Polish') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Sunday Call Time\n\nAll ushers report by 8:30 AM.');
  });

  it('does not overwrite existing notes when switching to polish mode if notes already present', () => {
    renderModal({
      currentTitle: 'Title',
      currentMessage: 'Message',
    });

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'My custom notes' } });

    fireEvent.click(screen.getByText('Polish Existing'));
    expect(textarea.value).toBe('My custom notes');
  });

  it('handles empty currentTitle or currentMessage when switching to polish mode', () => {
    renderModal({
      currentTitle: '',
      currentMessage: 'Only message present',
    });

    fireEvent.click(screen.getByText('Polish Existing'));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Only message present');
  });

  it('allows switching between tones and forwards tone to mutation', () => {
    renderModal();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Urgent reminder' } });

    fireEvent.click(screen.getByText('Urgent & Direct'));
    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      mode: 'new',
      notes: 'Urgent reminder',
      tone: 'urgent',
      targetType: undefined,
      targetRoles: undefined,
    });

    fireEvent.click(screen.getByText('Informative & Clear'));
    fireEvent.click(screen.getByRole('button', { name: /regenerate draft/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      mode: 'new',
      notes: 'Urgent reminder',
      tone: 'informative',
      targetType: undefined,
      targetRoles: undefined,
    });
  });

  it('forwards targetType and targetRoles props to mutation', () => {
    renderModal({
      targetType: 'role',
      targetRoles: ['Usher', 'OIC'],
    });

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Usher specific notes' } });

    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      mode: 'new',
      notes: 'Usher specific notes',
      tone: 'pastoral',
      targetType: 'role',
      targetRoles: ['Usher', 'OIC'],
    });
  });

  it('disables generate button when notes are empty or whitespace only', () => {
    renderModal();

    const generateBtn = screen.getByRole('button', { name: /generate draft/i });
    expect(generateBtn).toBeDisabled();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(generateBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Valid notes' } });
    expect(generateBtn).not.toBeDisabled();
  });

  it('allows selecting the fun tone with emojis and sends tone: fun', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /fun & engaging/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Youth fellowship tonight' } });

    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: 'fun',
        notes: 'Youth fellowship tonight',
      }),
    );
  });

  it('generates unified draft and allows applying draft to broadcast form', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();

    renderModal({ onApply, onClose });

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Usher call time 8:15 AM' } });

    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      mode: 'new',
      notes: 'Usher call time 8:15 AM',
      tone: 'pastoral',
      targetType: undefined,
      targetRoles: undefined,
    });

    expect(toast.success).toHaveBeenCalledWith('Generated broadcast draft successfully!');
    expect(screen.getByText('Generated Announcement Draft')).toBeInTheDocument();
    expect(screen.getByText('Sunday Usher Alert')).toBeInTheDocument();
    expect(screen.getByText('Report at 8:15 AM for prayer.')).toBeInTheDocument();

    // Apply Draft
    fireEvent.click(screen.getByRole('button', { name: /apply draft/i }));

    expect(onApply).toHaveBeenCalledWith({
      title: 'Sunday Usher Alert',
      message: 'Report at 8:15 AM for prayer.',
    });
    expect(toast.success).toHaveBeenCalledWith('Applied AI draft to broadcast form!');
    expect(onClose).toHaveBeenCalled();
  });

  it('supports copying unified draft text to clipboard and resets copied state after 2s', async () => {
    vi.useFakeTimers();
    renderModal();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Some notes' } });

    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    expect(screen.getByText('Generated Announcement Draft')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^copy$/i }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Sunday Usher Alert\n\nReport at 8:15 AM for prayer.',
    );
    expect(toast.success).toHaveBeenCalledWith('Copied draft to clipboard!');
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
  });

  it('handles clipboard failure gracefully when writeText throws', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Permission denied'));

    renderModal();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Some notes' } });

    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^copy$/i }));
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to copy to clipboard.');
  });

  it('clears notes and draft when closing via close button in footer', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Temporary notes' } });

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('displays loading spinner state while generating', () => {
    mockHookReturn = {
      isPending: true,
      isError: false,
      error: null,
      triggerSuccessOnMutate: false,
    };

    renderModal();

    expect(screen.getByText('Crafting Announcement...')).toBeInTheDocument();
  });

  it('displays error alert and calls toast.error when generation fails', () => {
    mockHookReturn = {
      isPending: false,
      isError: true,
      error: new Error('Rate limit exceeded'),
      triggerSuccessOnMutate: false,
    };

    renderModal();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Notes' } });

    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    expect(toast.error).toHaveBeenCalledWith('Rate limit exceeded');
    expect(screen.getByText('Draft Generation Failed')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('displays fallback error message when error has no message', () => {
    mockHookReturn = {
      isPending: false,
      isError: true,
      error: new Error(''),
      triggerSuccessOnMutate: false,
    };

    renderModal();

    expect(screen.getByText('Draft Generation Failed')).toBeInTheDocument();
    expect(
      screen.getByText('Unable to generate draft. Please check your inputs and try again.'),
    ).toBeInTheDocument();
  });

  it('calls toast.error with fallback when error message is empty string', () => {
    mockHookReturn = {
      isPending: false,
      isError: true,
      error: new Error(''),
      triggerSuccessOnMutate: false,
    };

    renderModal();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Notes' } });
    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    expect(toast.error).toHaveBeenCalledWith('Failed to generate draft.');
  });

  it('does not set notes when switching to polish mode with empty title and message', () => {
    renderModal({
      currentTitle: '   ',
      currentMessage: '   ',
    });

    fireEvent.click(screen.getByText('Polish Existing'));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('uses default empty strings for currentTitle and currentMessage when omitted', () => {
    render(<BroadcastDraftAiModal isOpen={true} onClose={vi.fn()} onApply={vi.fn()} />);

    fireEvent.click(screen.getByText('Polish Existing'));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('handles copy gracefully when navigator.clipboard is undefined', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    renderModal();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Some notes' } });
    fireEvent.click(screen.getByRole('button', { name: /generate draft/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^copy$/i }));
    });

    expect(toast.success).not.toHaveBeenCalledWith('Copied draft to clipboard!');
  });
});
