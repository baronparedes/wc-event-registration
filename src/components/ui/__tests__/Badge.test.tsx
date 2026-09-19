import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('uses success variant by default', () => {
    render(<Badge>Open</Badge>);

    expect(screen.getByText('Open')).toHaveClass('bg-primary');
    expect(screen.getByText('Open')).toHaveClass('text-white');
  });

  it('renders each variant class', () => {
    const { rerender } = render(<Badge variant="secondary">Secondary</Badge>);
    expect(screen.getByText('Secondary')).toHaveClass('bg-secondary');

    rerender(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline')).toHaveClass('border-primary/60');

    rerender(<Badge variant="accent">Accent</Badge>);
    expect(screen.getByText('Accent')).toHaveClass('bg-accent');
    expect(screen.getByText('Accent')).toHaveClass('text-text');

    rerender(<Badge variant="destructive">Destructive</Badge>);
    expect(screen.getByText('Destructive')).toHaveClass('bg-red-600');

    rerender(<Badge variant="primaryOutline">Primary Outline</Badge>);
    expect(screen.getByText('Primary Outline')).toHaveClass('border-primary');

    rerender(<Badge variant="ghost">Ghost</Badge>);
    expect(screen.getByText('Ghost')).toHaveClass('bg-transparent');

    rerender(<Badge variant="link">Link</Badge>);
    expect(screen.getByText('Link')).toHaveClass('underline');
  });

  it('renders icon slot and custom class names', () => {
    render(
      <Badge className="my-badge" icon={<span data-testid="icon">i</span>}>
        Label
      </Badge>,
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Label')).toHaveClass('my-badge');
  });
});
