import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});
