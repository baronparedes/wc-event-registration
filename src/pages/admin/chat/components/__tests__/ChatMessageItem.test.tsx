import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatMessageItem } from '../ChatMessageItem';

const mockTokens: Record<string, { id: string; name: string }> = {
  USR_000123: { id: 'user-1', name: 'John Doe' },
};

vi.mock('@/hooks/domain/chat', () => ({
  useResolveUserTokensQuery: () => ({ data: mockTokens }),
  useUserTokenMapQuery: () => ({ data: mockTokens }),
}));

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: () => ({ data: null }),
}));

describe('ChatMessageItem', () => {
  it('renders user message and displayName avatar', () => {
    render(
      <ChatMessageItem
        message={{ id: '1', role: 'user', content: 'Can you show me the attendees?' }}
        displayName="Jane Doe"
      />,
    );

    expect(screen.getByText('Can you show me the attendees?')).toBeInTheDocument();
    expect(screen.getByTitle('Jane Doe')).toBeInTheDocument();
  });

  it('untokenizes member tokens for display in user message bubbles', () => {
    render(
      <ChatMessageItem
        message={{ id: '1', role: 'user', content: 'Is USR_000123 scheduled for Sunday?' }}
        displayName="Jane Doe"
      />,
    );

    expect(screen.getByText('Is John Doe scheduled for Sunday?')).toBeInTheDocument();
  });

  it('renders assistant message with brand avatar and content', () => {
    render(
      <ChatMessageItem
        message={{ id: '2', role: 'assistant', content: 'Here are the attendees.' }}
        displayName="Jane Doe"
        isLoading={false}
      />,
    );

    expect(screen.getByText('Here are the attendees.')).toBeInTheDocument();
    expect(screen.getByAltText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
  });

  it('renders spinner loader when assistant message content is empty during stream', () => {
    render(
      <ChatMessageItem
        message={{ id: '3', role: 'assistant', content: '' }}
        displayName="Jane Doe"
        isLoading={true}
      />,
    );

    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });
});
