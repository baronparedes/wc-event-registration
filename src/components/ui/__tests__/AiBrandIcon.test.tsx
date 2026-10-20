import { createRef } from 'react';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AiBrandIcon } from '../AiBrandIcon';

describe('AiBrandIcon', () => {
  it('renders with default props (trimmed glyph variant, 24px size, fill="currentColor")', () => {
    const { container } = render(<AiBrandIcon data-testid="brand-icon" />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    // Trimmed glyph viewBox removes dead space around the logo
    expect(svg).toHaveAttribute('viewBox', '412 520 3815 3065');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('fill', 'currentColor');
    expect(svg).toHaveAttribute('stroke', 'none');
    expect(svg).toHaveAttribute('aria-hidden', 'true');

    const path = svg?.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('fill-rule', 'evenodd');
    // Glyph variant path starts with the Welcome speech bubble (M 1605.346)
    expect(path?.getAttribute('d')).toContain('M 1605.346');
    expect(path?.getAttribute('d')).not.toContain('M 0 2250 L 0 4500');
  });

  it('renders badge variant with outer square container path and full square viewBox', () => {
    const { container } = render(<AiBrandIcon variant="badge" />);
    const svg = container.querySelector('svg');
    const path = svg?.querySelector('path');

    expect(svg).toHaveAttribute('viewBox', '0 0 4500 4500');
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute('d')).toContain('M 0 2250 L 0 4500');
    expect(path?.getAttribute('d')).toContain('M 1605.346');
  });

  it('allows overriding viewBox via prop', () => {
    const { container } = render(<AiBrandIcon viewBox="0 0 100 100" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
  });

  it('supports custom size, className, and color prop', () => {
    const { container } = render(
      <AiBrandIcon size={32} color="#009688" className="h-8 w-8 text-primary" />,
    );
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveAttribute('fill', '#009688');
    expect(svg).toHaveClass('h-8', 'w-8', 'text-primary');
  });

  it('supports explicit fill prop override', () => {
    const { container } = render(<AiBrandIcon fill="white" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('fill', 'white');
  });

  it('removes aria-hidden when aria-label is provided for accessibility', () => {
    const { container } = render(<AiBrandIcon aria-label="Welcome Hub logo" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-label', 'Welcome Hub logo');
    expect(svg).not.toHaveAttribute('aria-hidden');
  });

  it('forwards ref to the underlying SVG element', () => {
    const ref = createRef<SVGSVGElement>();
    render(<AiBrandIcon ref={ref} />);

    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });
});
