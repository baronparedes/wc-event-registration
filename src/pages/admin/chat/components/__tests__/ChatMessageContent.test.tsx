import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChatMessageContent } from '../ChatMessageContent';

describe('ChatMessageContent', () => {
  it('renders standard text and paragraphs', () => {
    render(<ChatMessageContent content="Hello world" />);
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
});
