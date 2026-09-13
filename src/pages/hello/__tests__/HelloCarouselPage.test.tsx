import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageCarousel } from '../components/ImageCarousel';
import { HelloCarouselPage } from '../index';

describe('HelloCarouselPage', () => {
  it('renders carousel gallery, slide title, and initial slide image', () => {
    render(<HelloCarouselPage />);

    expect(
      screen.getByRole('region', { name: /Hello Image Gallery Carousel/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('01 / 08')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Hello!' })).toBeInTheDocument();
    expect(screen.getByAltText('Hello!')).toBeInTheDocument();
    expect(screen.getByText(/Swipe or drag left \/ right/i)).toBeInTheDocument();
  });

  it('navigates forward when clicking Next button and backward when clicking Previous button', () => {
    render(<HelloCarouselPage />);

    const nextBtn = screen.getByRole('button', { name: /Next slide/i });
    const prevBtn = screen.getByRole('button', { name: /Previous slide/i });

    // Initial slide
    expect(screen.getByText('01 / 08')).toBeInTheDocument();

    // Click Next -> 02 / 08
    fireEvent.click(nextBtn);
    expect(screen.getByText('02 / 08')).toBeInTheDocument();
    expect(screen.getByAltText('Our Story')).toBeInTheDocument();

    // Click Previous -> 01 / 08
    fireEvent.click(prevBtn);
    expect(screen.getByText('01 / 08')).toBeInTheDocument();
    expect(screen.getByAltText('Hello!')).toBeInTheDocument();
  });

  it('wraps around to the last slide when navigating backwards from first slide', () => {
    render(<HelloCarouselPage />);

    const prevBtn = screen.getByRole('button', { name: /Previous slide/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText('08 / 08')).toBeInTheDocument();
    expect(screen.getByAltText("What's Next?")).toBeInTheDocument();

    // Clicking Next on last slide wraps back to first slide
    const nextBtn = screen.getByRole('button', { name: /Next slide/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText('01 / 08')).toBeInTheDocument();
  });

  it('uses image icons as indicators and jumps directly to slide on click', () => {
    render(<HelloCarouselPage />);

    const indicator1 = screen.getByRole('button', { name: /Go to slide 1: Hello!/i });
    const indicator4 = screen.getByRole('button', {
      name: /Go to slide 4: Core Values/i,
    });

    // Indicator 1 starts active
    expect(indicator1).toHaveAttribute('aria-current', 'true');
    expect(indicator4).not.toHaveAttribute('aria-current');

    // Click image indicator 4
    fireEvent.click(indicator4);

    expect(screen.getByText('04 / 08')).toBeInTheDocument();
    expect(screen.getByAltText('Core Values')).toBeInTheDocument();
    expect(indicator4).toHaveAttribute('aria-current', 'true');
    expect(indicator1).not.toHaveAttribute('aria-current');
  });

  it('navigates via ArrowRight and ArrowLeft keyboard keys', () => {
    render(<HelloCarouselPage />);

    expect(screen.getByText('01 / 08')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('02 / 08')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('01 / 08')).toBeInTheDocument();
  });

  it('ignores arrow keys when typing inside an input or textarea', () => {
    render(
      <div>
        <input data-testid="test-input" type="text" />
        <HelloCarouselPage />
      </div>,
    );

    const input = screen.getByTestId('test-input');
    input.focus();

    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(screen.getByText('01 / 08')).toBeInTheDocument();
  });

  it('restarts slideshow to the first slide and disables restart on slide 1', () => {
    render(<HelloCarouselPage />);

    const restartBtn = screen.getByRole('button', { name: /Restart slideshow/i });
    expect(restartBtn).toBeDisabled();

    // Advance slide
    const nextBtn = screen.getByRole('button', { name: /Next slide/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText('02 / 08')).toBeInTheDocument();
    expect(restartBtn).not.toBeDisabled();

    // Click restart
    fireEvent.click(restartBtn);
    expect(screen.getByText('01 / 08')).toBeInTheDocument();
    expect(restartBtn).toBeDisabled();
  });

  it('toggles fullscreen and handles Escape key', () => {
    render(<HelloCarouselPage />);

    const fullscreenBtn = screen.getByRole('button', { name: /Enter fullscreen/i });
    fireEvent.click(fullscreenBtn);

    expect(screen.getByRole('button', { name: /Exit fullscreen/i })).toBeInTheDocument();

    // Press Escape to exit fullscreen
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /Enter fullscreen/i })).toBeInTheDocument();
  });

  it('renders fallback when no slides are provided', () => {
    render(<ImageCarousel slides={[]} />);

    expect(screen.getByText(/No images available in this carousel/i)).toBeInTheDocument();
  });

  describe('Autoplay and timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('advances slides automatically when autoplay is active', () => {
      render(<ImageCarousel autoPlayDefault={true} />);

      expect(screen.getByText('01 / 08')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4500);
      });

      expect(screen.getByText('02 / 08')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4500);
      });

      expect(screen.getByText('03 / 08')).toBeInTheDocument();
    });

    it('stops advancing when autoplay is paused', () => {
      render(<ImageCarousel autoPlayDefault={true} />);

      const pauseBtn = screen.getByRole('button', { name: /Pause autoplay/i });
      fireEvent.click(pauseBtn);

      expect(screen.getByRole('button', { name: /Start autoplay/i })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(9000);
      });

      expect(screen.getByText('01 / 08')).toBeInTheDocument();
    });

    it('toggles autoplay via Space key', () => {
      render(<HelloCarouselPage />);

      expect(screen.getByRole('button', { name: /Start autoplay/i })).toBeInTheDocument();

      fireEvent.keyDown(window, { key: ' ' });
      expect(screen.getByRole('button', { name: /Pause autoplay/i })).toBeInTheDocument();

      fireEvent.keyDown(window, { key: ' ' });
      expect(screen.getByRole('button', { name: /Start autoplay/i })).toBeInTheDocument();
    });
  });
});
