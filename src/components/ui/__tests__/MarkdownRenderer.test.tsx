import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownRenderer } from '../MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('returns null when content is null, undefined or empty', () => {
    const { container: c1 } = render(<MarkdownRenderer content={null} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(<MarkdownRenderer content={undefined} />);
    expect(c2).toBeEmptyDOMElement();

    const { container: c3 } = render(<MarkdownRenderer content="" />);
    expect(c3).toBeEmptyDOMElement();
  });

  it('renders markdown formatted content including external links', () => {
    const markdown = `# Title\n\n[External](https://google.com)\n\n[Internal](/profile)`;
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();

    const externalLink = screen.getByRole('link', { name: 'External' });
    expect(externalLink).toHaveAttribute('target', '_blank');
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');

    const internalLink = screen.getByRole('link', { name: 'Internal' });
    expect(internalLink).not.toHaveAttribute('target');
  });
});
