import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminChatPage } from '../index';

const { mockStreamRequest, mockUseChatStream, mockUseAdminAuthQuery, mockUseCurrentProfileQuery } =
  vi.hoisted(() => ({
    mockStreamRequest: vi.fn(),
    mockUseChatStream: vi.fn(),
    mockUseAdminAuthQuery: vi.fn(),
    mockUseCurrentProfileQuery: vi.fn(),
  }));

vi.mock('@/hooks/domain/chat', () => ({
  useChatStreamQuery: () => mockUseChatStream(),
  useChatStream: () => mockUseChatStream(),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
  useMemberAvatarQuery: () => ({ data: null }),
}));

describe('AdminChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChatStream.mockReturnValue({
      streamRequest: mockStreamRequest,
      isLoading: false,
    });
    mockUseAdminAuthQuery.mockReturnValue({
      data: { session: { user: { email: 'admin@example.com' } } },
    });
    mockUseCurrentProfileQuery.mockReturnValue({
      data: { full_name: 'Admin User', avatar_object_key: 'avatars/admin.jpg' },
    });
  });

  it('renders initial empty state', () => {
    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Hi! I'm your AI assistant.")).toBeInTheDocument();
    expect(screen.getByText('Ask me questions about your events.')).toBeInTheDocument();
  });

  it('submits a message, displays user message and avatar, and streams response', async () => {
    mockStreamRequest.mockImplementation(
      async (_payload: unknown, onChunk: (text: string) => void) => {
        onChunk('Hello there!');
      },
    );

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'How many members registered?' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    expect(screen.getByText('How many members registered?')).toBeInTheDocument();
    // Verify user avatar is rendered with user initials / name title
    expect(screen.getByTitle('Admin User')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockStreamRequest).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
  });

  it('displays error message when streamRequest fails', async () => {
    mockStreamRequest.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'Hello' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Sorry, I encountered an error.')).toBeInTheDocument();
    });
  });

  it('displays coffee break message when rate limit or quota is exceeded', async () => {
    mockStreamRequest.mockRejectedValue(
      new Error("I'm on a coffee break, you can come back later."),
    );

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'Hello' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText("I'm on a coffee break, you can come back later."),
      ).toBeInTheDocument();
    });
  });

  it('renders a single assistant bubble during streaming loading state without duplicates', async () => {
    let resolveStream: () => void;
    const streamPromise = new Promise<void>((resolve) => {
      resolveStream = resolve;
    });

    mockStreamRequest.mockImplementation(() => streamPromise);

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'What events are tomorrow?' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    // Verify user message is present
    expect(screen.getByText('What events are tomorrow?')).toBeInTheDocument();

    // Verify exactly one loader spinner is rendered (inside the assistant bubble)
    const loaders = document.querySelectorAll('.animate-spin');
    expect(loaders).toHaveLength(1);

    // Resolve stream and clean up
    resolveStream!();
  });
});
