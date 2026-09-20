import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminChatPage } from '../index';

const {
  mockStreamRequest,
  mockUseChatStream,
  mockUseAdminAuthQuery,
  mockUseCurrentProfileQuery,
  mockUseUserTokenMapQuery,
} = vi.hoisted(() => ({
  mockStreamRequest: vi.fn(),
  mockUseChatStream: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
  mockUseCurrentProfileQuery: vi.fn(),
  mockUseUserTokenMapQuery: vi.fn().mockReturnValue({ data: {} }),
}));

vi.mock('@/hooks/domain/chat', () => ({
  useChatStreamQuery: () => mockUseChatStream(),
  useChatStream: () => mockUseChatStream(),
  useResolveUserTokensQuery: () => mockUseUserTokenMapQuery(),
  useUserTokenMapQuery: () => mockUseUserTokenMapQuery(),
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
    window.sessionStorage.clear();
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
    expect(screen.getByText('Ask me questions about data and events.')).toBeInTheDocument();
    expect(screen.getByAltText('AI Assistant')).toBeInTheDocument();
    expect(screen.getAllByText('Beta').length).toBeGreaterThanOrEqual(1);
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
    // Verify bot brand avatar is rendered
    expect(screen.getAllByAltText('AI Assistant').length).toBeGreaterThanOrEqual(1);

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

  it('displays coffee break message when stream resolves with empty content', async () => {
    mockStreamRequest.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'Any events?' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText("I'm on a coffee break, you can come back later."),
      ).toBeInTheDocument();
    });
  });

  it('displays coffee break message on RESOURCE_EXHAUSTED error', async () => {
    mockStreamRequest.mockRejectedValue(
      new Error('[GoogleGenerativeAI Error]: Resource has been exhausted (e.g. check quota)'),
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

  it('restores previous messages from sessionStorage across page refreshes', () => {
    window.sessionStorage.setItem(
      'wc_admin_chat_messages',
      JSON.stringify([
        { id: '1', role: 'user', content: 'What is happening this Sunday?' },
        { id: '2', role: 'assistant', content: 'We have 2 events scheduled.' },
      ]),
    );

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('What is happening this Sunday?')).toBeInTheDocument();
    expect(screen.getByText('We have 2 events scheduled.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear Chat/i })).toBeInTheDocument();
  });

  it('clears chat history when Clear Chat button is clicked', async () => {
    window.sessionStorage.setItem(
      'wc_admin_chat_messages',
      JSON.stringify([
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' },
      ]),
    );

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    const clearButton = screen.getByRole('button', { name: /Clear Chat/i });
    fireEvent.click(clearButton);

    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
    expect(screen.getByText("Hi! I'm your AI assistant.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem('wc_admin_chat_messages')).toBeNull();
  });

  it('limits payload messages sent to streamRequest using sliding context window', async () => {
    const historicalMessages = Array.from({ length: 25 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}`,
    }));
    window.sessionStorage.setItem('wc_admin_chat_messages', JSON.stringify(historicalMessages));

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'New query' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockStreamRequest).toHaveBeenCalledTimes(1);
    });

    const callPayload = mockStreamRequest.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(callPayload.messages).toHaveLength(20);
    expect(callPayload.messages[callPayload.messages.length - 1]?.content).toBe('New query');
    expect(callPayload.messages[0]?.content).toBe('Message 6'); // 26 total (25 historical + 1 new), last 20 starts at index 6
  });

  it('tokenizes user names in the network request payload while displaying natural names in UI', async () => {
    mockUseUserTokenMapQuery.mockReturnValue({
      data: {
        USR_000001: {
          id: 'u-1',
          name: 'John Doe',
          fullName: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    });

    render(
      <MemoryRouter>
        <AdminChatPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'Is John Doe scheduled for Sunday?' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockStreamRequest).toHaveBeenCalledTimes(1);
    });

    const callPayload = mockStreamRequest.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    // Ensure raw name NEVER reached the request
    expect(callPayload.messages[0]?.content).toBe('Is USR_000001 scheduled for Sunday?');
    expect(callPayload.messages[0]?.content).not.toContain('John Doe');

    // UI displays the untokenized name
    expect(screen.getByText('Is John Doe scheduled for Sunday?')).toBeInTheDocument();
  });
});
