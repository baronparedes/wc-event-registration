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
    expect(
      screen.getByText('Ask me questions about your events, forms and members.'),
    ).toBeInTheDocument();
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
});
