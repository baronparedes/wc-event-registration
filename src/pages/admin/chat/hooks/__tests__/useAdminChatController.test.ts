import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CHAT_STORAGE_KEY,
  loadStoredChatMessages,
  useAdminChatController,
} from '../useAdminChatController';

const {
  mockStreamRequest,
  mockStopStream,
  mockUseChatStream,
  mockUseAdminAuthQuery,
  mockUseCurrentProfileQuery,
  mockUseUserTokenMapQuery,
} = vi.hoisted(() => ({
  mockStreamRequest: vi.fn(),
  mockStopStream: vi.fn(),
  mockUseChatStream: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
  mockUseCurrentProfileQuery: vi.fn(),
  mockUseUserTokenMapQuery: vi.fn().mockReturnValue({ data: {} }),
}));

vi.mock('@/hooks/domain/chat', () => ({
  useChatStreamQuery: () => mockUseChatStream(),
  useUserTokenMapQuery: () => mockUseUserTokenMapQuery(),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
}));

describe('useAdminChatController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mockUseChatStream.mockReturnValue({
      streamRequest: mockStreamRequest,
      stopStream: mockStopStream,
      isLoading: false,
    });
    mockUseAdminAuthQuery.mockReturnValue({
      data: { session: { user: { email: 'admin@example.com' } } },
    });
    mockUseCurrentProfileQuery.mockReturnValue({
      data: { full_name: 'Test Admin', avatar_object_key: 'avatars/admin.jpg' },
    });
  });

  it('loads valid messages from sessionStorage and safely ignores corrupt JSON', () => {
    window.sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify([{ id: 'msg-1', role: 'user', content: 'Saved question' }]),
    );

    const loaded = loadStoredChatMessages();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].content).toBe('Saved question');

    // Corrupt JSON
    window.sessionStorage.setItem(CHAT_STORAGE_KEY, '{invalid json');
    expect(loadStoredChatMessages()).toEqual([]);
  });

  it('initializes with profile display details and empty messages', () => {
    const { result } = renderHook(() => useAdminChatController());

    expect(result.current.displayName).toBe('Test Admin');
    expect(result.current.avatarObjectKey).toBe('avatars/admin.jpg');
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('clears chat history and removes from sessionStorage on handleClearChat', () => {
    window.sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify([{ id: 'msg-1', role: 'user', content: 'Test' }]),
    );

    const { result } = renderHook(() => useAdminChatController());
    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.handleClearChat();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(window.sessionStorage.getItem(CHAT_STORAGE_KEY)).toBeNull();
  });

  it('sends a message and streams assistant response', async () => {
    mockStreamRequest.mockImplementation(
      async (_payload: unknown, onChunk: (text: string) => void) => {
        onChunk('Streaming answer');
      },
    );

    const { result } = renderHook(() => useAdminChatController());

    await act(async () => {
      await result.current.handleSendMessage('Hello AI');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'Hello AI' });
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Streaming answer',
    });
  });
});
