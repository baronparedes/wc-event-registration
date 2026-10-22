import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingState } from '../LoadingState';

describe('LoadingState component', () => {
  describe('Layouts', () => {
    it('renders with vertical layout by default', () => {
      render(<LoadingState message="Loading vertical..." />);

      const statusContainer = screen.getByRole('status');
      // vertical layout includes 'flex-col' and 'justify-center'
      expect(statusContainer.className).toContain('flex-col');
      expect(statusContainer.className).toContain('justify-center');

      expect(screen.getByText('Loading vertical...')).toBeInTheDocument();
    });

    it('renders with horizontal layout when specified', () => {
      render(<LoadingState layout="horizontal" message="Loading horizontal..." />);

      const statusContainer = screen.getByRole('status');
      // horizontal layout uses 'inline-flex' and doesn't use 'flex-col'
      expect(statusContainer.className).toContain('inline-flex');
      expect(statusContainer.className).not.toContain('flex-col');

      expect(screen.getByText('Loading horizontal...')).toBeInTheDocument();
    });
  });

  describe('Accessibility & Content', () => {
    it('has role="status" on the main container', () => {
      render(<LoadingState />);
      const element = screen.getByRole('status');
      expect(element).toBeInTheDocument();
    });

    it('renders a visually hidden fallback text when no message is provided (vertical)', () => {
      render(<LoadingState layout="vertical" />);
      const fallback = screen.getByText('Loading...');
      expect(fallback).toBeInTheDocument();
      expect(fallback.className).toContain('sr-only');
    });

    it('renders a visually hidden fallback text when no message is provided (horizontal)', () => {
      render(<LoadingState layout="horizontal" />);
      const fallback = screen.getByText('Loading...');
      expect(fallback).toBeInTheDocument();
      expect(fallback.className).toContain('sr-only');
    });

    it('does not render screen reader text if a message is provided', () => {
      render(<LoadingState message="Fetching data..." />);
      expect(screen.getByText('Fetching data...')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Customization', () => {
    it('applies custom className to the main container', () => {
      render(<LoadingState className="custom-container-class" />);
      const container = screen.getByRole('status');
      expect(container.className).toContain('custom-container-class');
    });

    it('applies custom spinnerClassName to the spinner element', () => {
      // We pass a message so we know what text the spinner is next to
      render(<LoadingState message="Testing Spinner" spinnerClassName="custom-spinner-class" />);
      // We know the container is role=status, and the spinner is an SVG with aria-hidden="true"
      // Since it's a presentational prop test, we have to look inside the status container
      const container = screen.getByRole('status');
      // The spinner is the first child in this implementation
      const spinnerEl = container.firstChild as HTMLElement;
      expect(spinnerEl?.className).toContain('custom-spinner-class');
    });

    it('applies custom messageClassName to the message element', () => {
      render(<LoadingState message="Custom msg" messageClassName="custom-msg-class" />);
      const msg = screen.getByText('Custom msg');
      expect(msg.className).toContain('custom-msg-class');
    });

    it('passes down other HTML attributes to the main container', () => {
      render(<LoadingState data-testid="my-loading" id="loader-1" />);
      const container = screen.getByTestId('my-loading');
      expect(container).toHaveAttribute('id', 'loader-1');
      expect(container).toHaveAttribute('role', 'status');
    });
  });
});
