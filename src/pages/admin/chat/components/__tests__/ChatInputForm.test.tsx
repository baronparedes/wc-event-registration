import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatInputForm } from '../ChatInputForm';

describe('ChatInputForm', () => {
  const mockTokenMap = {
    USR_000001: {
      id: 'user-1',
      name: 'John Doe',
      fullName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      nickname: 'Johnny',
    },
    USR_000002: {
      id: 'user-2',
      name: 'Jane Smith',
      fullName: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      nickname: 'Janey',
    },
  };

  it('renders input field and send button', () => {
    render(<ChatInputForm isLoading={false} onSubmit={vi.fn()} onStop={vi.fn()} />);

    expect(screen.getByPlaceholderText(/Ask me anything/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/i })).toBeDisabled();
  });

  it('enables send button when typing non-whitespace text and clears input on submit', () => {
    const handleSubmit = vi.fn();
    render(<ChatInputForm isLoading={false} onSubmit={handleSubmit} onStop={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Ask me anything/i);
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

    const input = screen.getByPlaceholderText(/Ask me anything/i);
    fireEvent.change(input, { target: { value: 'Is @joh' } });

    expect(screen.getByRole('listbox', { name: /Mention members/i })).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('John Doe'));
    expect(input).toHaveValue('Is @John Doe ');
  });

  it('navigates candidates with keyboard and selects with Enter', () => {
    render(
      <ChatInputForm
        isLoading={false}
        onSubmit={vi.fn()}
        onStop={vi.fn()}
        tokenMap={mockTokenMap}
      />,
    );

    const input = screen.getByPlaceholderText(/Ask me anything/i);
    fireEvent.change(input, { target: { value: '@' } });

    expect(screen.getByRole('listbox', { name: /Mention members/i })).toBeInTheDocument();

    // Arrow down to second item
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveValue('@John Doe ');
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

    const input = screen.getByPlaceholderText(/Ask me anything/i);
    fireEvent.change(input, { target: { value: '@joh' } });

    expect(screen.getByRole('listbox', { name: /Mention members/i })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: /Mention members/i })).not.toBeInTheDocument();
  });
});
