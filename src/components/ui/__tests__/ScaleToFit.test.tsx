import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScaleToFit } from '../ScaleToFit';

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

describe('ScaleToFit', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight',
  );
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 1000,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 1024,
    });
  });

  afterEach(() => {
    setViewport(originalWidth, originalHeight);
    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    }
  });

  it('renders children', () => {
    render(
      <ScaleToFit>
        <p>Hello</p>
      </ScaleToFit>,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('scales down when content is taller than the viewport', () => {
    setViewport(1024, 500);
    render(
      <ScaleToFit>
        <p>Hello</p>
      </ScaleToFit>,
    );
    expect(screen.getByTestId('scale-to-fit-content').style.transform).toContain('scale(0.5)');
  });

  it('scales up when the viewport is larger than the content, capped at 2x', () => {
    setViewport(4000, 4000);
    render(
      <ScaleToFit>
        <p>Hello</p>
      </ScaleToFit>,
    );
    expect(screen.getByTestId('scale-to-fit-content').style.transform).toContain('scale(2)');
  });

  it('uses compact design width on narrow viewport', () => {
    setViewport(600, 800);
    const { rerender } = render(
      <ScaleToFit compactBreakpoint={640} compactDesignWidth={420} designWidth={1024}>
        <p>Responsive Content</p>
      </ScaleToFit>,
    );
    const contentDiv = screen.getByTestId('scale-to-fit-content');
    expect(contentDiv).toHaveStyle({ width: '420px' });

    setViewport(800, 800);
    rerender(
      <ScaleToFit compactBreakpoint={640} compactDesignWidth={420} designWidth={1024}>
        <p>Responsive Content</p>
      </ScaleToFit>,
    );
    expect(contentDiv).toHaveStyle({ width: '1024px' });
  });

  it('applies custom className', () => {
    render(
      <ScaleToFit className="custom-class">
        <p>Content</p>
      </ScaleToFit>,
    );
    const container = screen.getByTestId('scale-to-fit-content').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('handles ResizeObserver for content changes', () => {
    const mockObserve = vi.fn();
    const mockDisconnect = vi.fn();

    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = mockObserve;
        disconnect = mockDisconnect;
      },
    );

    render(
      <ScaleToFit>
        <p>Resizable Content</p>
      </ScaleToFit>,
    );

    expect(mockObserve).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('uses custom design width and compact design width', () => {
    setViewport(500, 800);
    render(
      <ScaleToFit designWidth={1200} compactDesignWidth={500} compactBreakpoint={600}>
        <p>Content</p>
      </ScaleToFit>,
    );
    const contentDiv = screen.getByTestId('scale-to-fit-content');
    expect(contentDiv).toHaveStyle({ width: '500px' });
  });

  it('handles edge case when offsetHeight is zero', () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 0,
    });

    setViewport(1024, 800);
    render(
      <ScaleToFit>
        <p>Content</p>
      </ScaleToFit>,
    );
    const contentDiv = screen.getByTestId('scale-to-fit-content');
    expect(contentDiv.style.transform).toContain('scale(1)');
  });

  it('handles negative scale by defaulting to 1', () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => -100,
    });

    setViewport(1024, 800);
    render(
      <ScaleToFit>
        <p>Content</p>
      </ScaleToFit>,
    );
    const contentDiv = screen.getByTestId('scale-to-fit-content');
    expect(contentDiv.style.transform).toContain('scale(1)');
  });

  it('centers content with correct transform origin', () => {
    render(
      <ScaleToFit>
        <p>Centered</p>
      </ScaleToFit>,
    );
    const contentDiv = screen.getByTestId('scale-to-fit-content');
    expect(contentDiv.style.transformOrigin).toBe('center center');
    expect(contentDiv.style.left).toBe('50%');
    expect(contentDiv.style.top).toBe('50%');
    expect(contentDiv.style.position).toBe('absolute');
  });
});
