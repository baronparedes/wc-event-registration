import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrandAvatar } from '../BrandAvatar';

describe('BrandAvatar', () => {
  it('renders default brand avatar with default alt and md size', () => {
    render(<BrandAvatar />);

    const img = screen.getByRole('img', { name: 'AI Assistant' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'AI Assistant');

    const container = screen.getByTitle('AI Assistant');
    expect(container).toHaveClass('h-14', 'w-14', 'rounded-full');
  });

  it('renders with custom size, alt, and className', () => {
    render(<BrandAvatar size="xs" alt="Bot Profile" className="custom-bot-avatar" />);

    const img = screen.getByRole('img', { name: 'Bot Profile' });
    expect(img).toBeInTheDocument();

    const container = screen.getByTitle('Bot Profile');
    expect(container).toHaveClass('h-8', 'w-8', 'custom-bot-avatar');
  });
});
