import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImageCanvas } from '../ImageCanvas';

describe('ImageCanvas', () => {
  it('renders children correctly', () => {
    const { container } = render(
      <ImageCanvas>
        <div data-testid="child-element">Test Content</div>
      </ImageCanvas>,
    );
    expect(screen.getByTestId('child-element')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(container.firstChild).not.toHaveClass('pointer-events-none');
  });

  it('renders with specific class and width when not hidden', () => {
    const { container } = render(
      <ImageCanvas className="test-class" width={500}>
        <div>Test Content</div>
      </ImageCanvas>,
    );
    expect(container.firstChild).toHaveClass('test-class');
    expect(container.firstChild).toHaveStyle({ width: '500px' });
  });

  it('handles hidden prop and renders with specific styles', () => {
    const { container } = render(
      <ImageCanvas hidden>
        <div>Hidden Content</div>
      </ImageCanvas>,
    );

    const hiddenWrapper = container.firstChild;
    expect(hiddenWrapper).toHaveClass('pointer-events-none');
    expect(hiddenWrapper).toHaveStyle({
      position: 'fixed',
      left: '0',
      top: '0',
      width: '0px',
      height: '0px',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '-9999',
      opacity: '0.001',
    });
    expect(hiddenWrapper).toHaveAttribute('aria-hidden', 'true');

    const innerWrapper = hiddenWrapper?.firstChild;
    expect(innerWrapper).toHaveClass('bg-white');
  });

  it('handles hidden prop with custom class and width', () => {
    const { container } = render(
      <ImageCanvas hidden className="custom-hidden-class" width={600}>
        <div>Hidden Content</div>
      </ImageCanvas>,
    );

    const hiddenWrapper = container.firstChild;
    const innerWrapper = hiddenWrapper?.firstChild;
    expect(innerWrapper).toHaveClass('bg-white custom-hidden-class');
    expect(innerWrapper).toHaveStyle({ width: '600px', maxWidth: '600px' });
  });

  it('assigns canvasRef properly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <ImageCanvas canvasRef={ref}>
        <div>Ref Content</div>
      </ImageCanvas>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
  });
});
