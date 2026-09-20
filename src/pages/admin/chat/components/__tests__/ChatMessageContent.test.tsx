import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ChatMessageContent } from '../ChatMessageContent';

const mockResolvedTokens = vi.fn().mockReturnValue({});

vi.mock('@/hooks/domain/chat', () => ({
  useResolveUserTokensQuery: () => ({ data: mockResolvedTokens() }),
}));

describe('ChatMessageContent', () => {
  beforeEach(() => {
    mockResolvedTokens.mockReturnValue({});
  });
  it('renders standard text and paragraphs', () => {
    render(
      <MemoryRouter>
        <ChatMessageContent content="Hello world" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders bold and italic text properly', () => {
    const { container } = render(
      <ChatMessageContent content="**Bold Title**: this is *italic* note" />,
    );
    expect(screen.getByText('Bold Title')).toBeInTheDocument();
    const strongElement = container.querySelector('strong');
    expect(strongElement).toHaveTextContent('Bold Title');
    const emElement = container.querySelector('em');
    expect(emElement).toHaveTextContent('italic');
  });

  it('renders ordered and unordered lists', () => {
    const markdown = `
1. **Events Management**: Look up upcoming events
2. **Member Search**: Search church members

- First bullet
- Second bullet
`;
    render(<ChatMessageContent content={markdown} />);
    expect(screen.getByText('Events Management')).toBeInTheDocument();
    expect(screen.getByText(/Look up upcoming events/)).toBeInTheDocument();
    expect(screen.getByText(/First bullet/)).toBeInTheDocument();
  });

  it('renders code blocks and inline code', () => {
    const markdown = 'Use `getEvents` to fetch records:\n\n```json\n{"status": "open"}\n```';
    const { container } = render(<ChatMessageContent content={markdown} />);
    expect(screen.getByText('getEvents')).toBeInTheDocument();
    expect(container.querySelector('code')).toBeInTheDocument();
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('renders links with secure attributes', () => {
    const markdown = '[Welcome Center](https://example.com)';
    render(<ChatMessageContent content={markdown} />);
    const link = screen.getByRole('link', { name: 'Welcome Center' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders internal event links targeting a new tab', () => {
    const markdown = 'Here is the event: [Sunday Service](/admin/events/event-123)';
    render(<ChatMessageContent content={markdown} />);
    const link = screen.getByRole('link', { name: 'Sunday Service' });
    expect(link).toHaveAttribute('href', '/admin/events/event-123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders tables with gfm', () => {
    const markdown = `
| Event | Status |
| --- | --- |
| Baptism | Open |
`;
    render(<ChatMessageContent content={markdown} />);
    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('Baptism')).toBeInTheDocument();
  });

  it('renders untokenized user links targeting a new tab with secure attributes', () => {
    mockResolvedTokens.mockReturnValue({
      USR_000123: { id: 'user-456', name: 'John Doe' },
    });
    render(<ChatMessageContent content="Assigned to USR_000123" />);
    const link = screen.getByRole('link', { name: /John Doe/i });
    expect(link).toHaveAttribute('href', '/admin/members/user-456');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders clean plain names without markdown link syntax inside code blocks', () => {
    mockResolvedTokens.mockReturnValue({
      USR_000123: { id: 'user-456', name: 'John Doe' },
    });
    const markdown = '```csv\nName,Role\nUSR_000123,Usher\n```';
    render(<ChatMessageContent content={markdown} />);
    expect(screen.getByText(/John Doe,Usher/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /John Doe/i })).not.toBeInTheDocument();
  });

  it('provides a copy button on code blocks', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(<ChatMessageContent content={'```csv\nName,Role\nAlice,Usher\n```'} />);
    const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
    expect(copyButton).toBeInTheDocument();

    await act(async () => {
      copyButton.click();
    });
    expect(writeTextMock).toHaveBeenCalledWith('Name,Role\nAlice,Usher');
  });
});
