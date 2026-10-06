import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CoverPhotoCropDialog } from '../CoverPhotoCropDialog';

describe('CoverPhotoCropDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders crop modal with guides, controls, and image preview when open', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    expect(screen.getByText('Adjust Cover Photo')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Drag to reposition, use the zoom slider, or toggle fit/fill to adjust framing for the 16:9 banner.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('What you see inside the 16:9 frame is exactly what will be displayed.'),
    ).toBeInTheDocument();
    expect(screen.getByText('16:9 Banner Crop Area')).toBeInTheDocument();
    expect(screen.getByText('1920 × 1080 Full HD')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Fit Whole Image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fill Frame/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Grid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overlay Guide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rotate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply & Save Cover/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom image')).toBeInTheDocument();
  });

  it('toggles grid and overlay guide when clicked', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const overlayGuideBtn = screen.getByRole('button', { name: /Overlay Guide/i });
    expect(screen.queryByText('Open for Registration')).not.toBeInTheDocument();

    fireEvent.click(overlayGuideBtn);
    expect(screen.getByText('Open for Registration')).toBeInTheDocument();

    fireEvent.click(overlayGuideBtn);
    expect(screen.queryByText('Open for Registration')).not.toBeInTheDocument();
  });

  it('switches between Crop & Position and Live Preview tabs', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const livePreviewTab = screen.getByRole('button', { name: /Live Preview/i });
    fireEvent.click(livePreviewTab);

    expect(screen.getByText(/Registration Page Banner Preview/i)).toBeInTheDocument();
    expect(screen.getByText('Event Title (Live Page Banner)')).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /Back to Crop & Position/i });
    fireEvent.click(backBtn);

    expect(screen.getByText('16:9 Banner Crop Area')).toBeInTheDocument();
  });

  it('handles Fit Whole Image and Fill Frame button clicks', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const zoomSlider = screen.getByLabelText('Zoom image');
    fireEvent.change(zoomSlider, { target: { value: '2' } });
    expect(screen.getByText('200%')).toBeInTheDocument();

    const fitBtn = screen.getByRole('button', { name: /Fit Whole Image/i });
    fireEvent.click(fitBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();

    const fillFrameBtn = screen.getByRole('button', { name: /Fill Frame/i });
    fireEvent.click(fillFrameBtn);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('updates zoom level when slider or zoom buttons are clicked', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const zoomSlider = screen.getByLabelText('Zoom image');
    fireEvent.change(zoomSlider, { target: { value: '1.5' } });
    expect(screen.getByText('150%')).toBeInTheDocument();

    const zoomInBtn = screen.getByLabelText('Zoom in');
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('160%')).toBeInTheDocument();

    const zoomOutBtn = screen.getByLabelText('Zoom out');
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('resets transform when Reset is clicked', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const zoomSlider = screen.getByLabelText('Zoom image');
    fireEvent.change(zoomSlider, { target: { value: '2' } });
    expect(screen.getByText('200%')).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /Reset/i });
    fireEvent.click(resetButton);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={onClose}
        onApplyCrop={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
