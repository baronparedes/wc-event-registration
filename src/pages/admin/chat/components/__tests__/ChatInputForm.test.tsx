import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatInputForm } from '../ChatInputForm';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name, avatarObjectKey }: { name: string; avatarObjectKey?: string | null }) => (
    <div
      role="img"
      aria-label={`Avatar of ${name}`}
      data-avatar-object-key={avatarObjectKey ?? ''}
    />
  ),
}));

describe('ChatInputForm', () => {
  const mockTokenMap = {
    USR_000001: {
      id: 'user-1',
      name: 'Test Bravo',
      fullName: 'Test Bravo',
      avatarObjectKey: 'avatars/member-1.jpg',
      firstName: 'Test Bravo',
      lastName: 'Test Member',
      nickname: 'Test Bravo Nick',
    },
    USR_000002: {
      id: 'user-2',
      name: 'Test Alpha',
      fullName: 'Test Alpha',
      firstName: 'Test Alpha',
      lastName: 'Test Member',
      nickname: 'Test Alpha Nick',
    },
  };

  it('renders input field with hints and send button', () => {
    render(<ChatInputForm isLoading={false} onSubmit={vi.fn()} onStop={vi.fn()} />);

    expect(
      screen.getByPlaceholderText(
        'Ask about volunteers, schedules, events... (Shift+Enter for new line, @ to mention)',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/i })).toBeDisabled();
  });

  it('enables send button when typing non-whitespace text and clears input on submit', () => {
    const handleSubmit = vi.fn();
    render(<ChatInputForm isLoading={false} onSubmit={handleSubmit} onStop={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Ask/i);
    fireEvent.change(input, { target: { value: 'Hello world' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    expect(sendButton).toBeEnabled();

    fireEvent.click(sendButton);
    expect(handleSubmit).toHaveBeenCalledWith('Hello world');
    expect(input).toHaveValue('');
  });

  it('renders stop button when isLoading is true and calls onStop when clicked', () => {
    const handleStop = vi.fn();
    render(<ChatInputForm isLoading={true} onSubmit={vi.fn()} onStop={handleStop} />);

    const stopButton = screen.getByRole('button', { name: /Stop generating/i });
    expect(stopButton).toBeInTheDocument();

    fireEvent.click(stopButton);
    expect(handleStop).toHaveBeenCalledTimes(1);
  });

  it('shows mention popover when user types @ and allows selecting candidate by click', () => {
    render(
      <ChatInputForm
        isLoading={false}
        onSubmit={vi.fn()}
        onStop={vi.fn()}
        tokenMap={mockTokenMap}
      />,
    );

    const input = screen.getByPlaceholderText(/Ask/i);
    fireEvent.change(input, { target: { value: 'Is @test b' } });

    expect(screen.getByRole('listbox', { name: /Mention members/i })).toBeInTheDocument();
    expect(screen.getByText('Test Bravo')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Test Bravo/ })).toHaveClass('bg-primary/10');
    expect(screen.getByRole('img', { name: 'Avatar of Test Bravo' })).toHaveAttribute(
      'data-avatar-object-key',
      'avatars/member-1.jpg',
    );

    fireEvent.mouseDown(screen.getByText('Test Bravo'));
    expect(input).toHaveValue('Is @Test Bravo ');
    expect(screen.queryByRole('listbox', { name: /Mention members/i })).not.toBeInTheDocument();
  });

  it('navigates candidates with keyboard and selects with Enter, immediately closing popover', () => {
    render(
      <ChatInputForm
        isLoading={false}
        onSubmit={vi.fn()}
        onStop={vi.fn()}
        tokenMap={mockTokenMap}
      />,
    );

    const input = screen.getByPlaceholderText(/Ask/i);
    fireEvent.change(input, { target: { value: '@' } });

    expect(screen.getByRole('listbox', { name: /Mention members/i })).toBeInTheDocument();

    // Arrow down to second candidate
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveValue('@Test Bravo ');
    expect(screen.queryByRole('listbox', { name: /Mention members/i })).not.toBeInTheDocument();
  });

  it('closes mention on Enter and submits the form when Enter is pressed a second time', () => {
    const handleSubmit = vi.fn();
    render(
      <ChatInputForm
        isLoading={false}
        onSubmit={handleSubmit}
        onStop={vi.fn()}
        tokenMap={mockTokenMap}
      />,
    );

    const input = screen.getByPlaceholderText(/Ask/i);
    fireEvent.change(input, { target: { value: '@test b' } });

    expect(screen.getByRole('listbox', { name: /Mention members/i })).toBeInTheDocument();

    // First Enter selects candidate and closes popover
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('@Test Bravo ');
    expect(screen.queryByRole('listbox', { name: /Mention members/i })).not.toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();

    // Second Enter submits the form directly
    fireEvent.submit(input.closest('form')!);
    expect(handleSubmit).toHaveBeenCalledWith('@Test Bravo');
  });

  it('dismisses mention popover when Escape is pressed', () => {
    render(
      <ChatInputForm
        isLoading={false}
        onSubmit={vi.fn()}
        onStop={vi.fn()}
        tokenMap={mockTokenMap}
      />,
    );

    const input = screen.getByPlaceholderText(/Ask/i);
    fireEvent.change(input, { target: { value: '@test b' } });

    expect(screen.getByRole('listbox', { name: /Mention members/i })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: /Mention members/i })).not.toBeInTheDocument();
  });

  it('renders primary underlined mention styling in backdrop when @ mention is present', () => {
    const { container } = render(
      <ChatInputForm
        isLoading={false}
        onSubmit={vi.fn()}
        onStop={vi.fn()}
        tokenMap={mockTokenMap}
      />,
    );

    const input = screen.getByPlaceholderText(/Ask/i);
    fireEvent.change(input, { target: { value: 'Ask @Test Bravo about Sunday' } });

    // The input becomes text-transparent so the backdrop is visible beneath it
    expect(input.className).toContain('text-transparent');

    // The backdrop renders the styled mention
    const mentionSpan = container.querySelector('span.text-primary.underline');
    expect(mentionSpan).toBeInTheDocument();
    expect(mentionSpan).toHaveTextContent('@Test Bravo');
  });

  it('submits on Enter keypress without Shift, and does not submit on Shift+Enter', () => {
    const handleSubmit = vi.fn();
    render(<ChatInputForm isLoading={false} onSubmit={handleSubmit} onStop={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/Ask/i);
    fireEvent.change(textarea, { target: { value: 'Line one' } });

    // Shift+Enter should NOT submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(handleSubmit).not.toHaveBeenCalled();

    // Plain Enter SHOULD submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(handleSubmit).toHaveBeenCalledWith('Line one');
    expect(textarea).toHaveValue('');
  });
});
