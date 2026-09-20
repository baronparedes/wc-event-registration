import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatMessageItem } from '../ChatMessageItem';

vi.mock('@/hooks/domain/chat', () => ({
  useResolveUserTokensQuery: () => ({ data: {} }),
  useUserTokenMapQuery: () => ({ data: {} }),
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
