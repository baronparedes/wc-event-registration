import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ColorSwatchDisplay } from '@/components/ui/ColorSwatchDisplay';

describe('ColorSwatchDisplay', () => {
  it('renders an em dash placeholder without swatch styling', () => {
    const { container } = render(<ColorSwatchDisplay value="—" />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.querySelector('.print-color-swatch')).not.toBeInTheDocument();
  });

  it('renders the default compact swatch for color values', () => {
    render(<ColorSwatchDisplay value="#22c55e" />);

    const swatch = screen.getByTitle('#22c55e');

    expect(swatch).toHaveClass('print-color-swatch');
    expect(swatch).toHaveClass('inline-block');
    expect(swatch).toHaveClass('h-8');
    expect(swatch).toHaveClass('w-8');
    expect(swatch).toHaveStyle({ backgroundColor: '#22c55e' });
    expect(swatch).toHaveAttribute(
      'style',
      expect.stringContaining('--print-swatch-color: #22c55e'),
    );
  });

  it('renders the full width swatch when requested', () => {
    render(<ColorSwatchDisplay value="#0f172a" fullWidth />);

    const swatch = screen.getByTitle('#0f172a');

    expect(swatch).toHaveClass('block');
    expect(swatch).toHaveClass('h-12');
    expect(swatch).toHaveClass('w-full');
    expect(swatch).not.toHaveClass('inline-block');
    expect(swatch).toHaveStyle({ backgroundColor: '#0f172a' });
    expect(swatch).toHaveAttribute(
      'style',
      expect.stringContaining('--print-swatch-color: #0f172a'),
    );
  });
});
