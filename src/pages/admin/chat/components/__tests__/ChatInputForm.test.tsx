import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatInputForm } from '../ChatInputForm';

describe('ChatInputForm', () => {
  it('renders input field and send button', () => {
    render(<ChatInputForm isLoading={false} onSubmit={vi.fn()} onStop={vi.fn()} />);

    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/i })).toBeDisabled();
  });

  it('enables send button when typing non-whitespace text and clears input on submit', () => {
    const handleSubmit = vi.fn();
    render(<ChatInputForm isLoading={false} onSubmit={handleSubmit} onStop={vi.fn()} />);

    const input = screen.getByPlaceholderText('Ask me anything...');
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
});
