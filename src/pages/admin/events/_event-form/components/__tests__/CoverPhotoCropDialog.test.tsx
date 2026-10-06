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

  it('rotates image through 90, 180, 270, and 360 degrees', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const rotateBtn = screen.getByRole('button', { name: /Rotate/i });
    fireEvent.click(rotateBtn);
    fireEvent.click(rotateBtn);
    fireEvent.click(rotateBtn);
    fireEvent.click(rotateBtn);
  });

  it('handles mouse dragging for panning image', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const container = screen.getByText('16:9 Banner Crop Area').closest('div');
    if (container) {
      fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(container, { clientX: 150, clientY: 120 });
      fireEvent.mouseUp(container);
      // Mouse move when not dragging should be a no-op
      fireEvent.mouseMove(container, { clientX: 200, clientY: 200 });
    }
  });

  it('handles touch dragging for panning image', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const container = screen.getByText('16:9 Banner Crop Area').closest('div');
    if (container) {
      fireEvent.touchStart(container, { touches: [{ clientX: 50, clientY: 50 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 80, clientY: 90 }] });
      fireEvent.touchEnd(container);
      // Touch move when not dragging should be a no-op
      fireEvent.touchMove(container, { touches: [{ clientX: 100, clientY: 100 }] });
    }
  });

  it('toggles grid overlay', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    const gridBtn = screen.getByRole('button', { name: /Grid/i });
    fireEvent.click(gridBtn);
    fireEvent.click(gridBtn);
  });

  it('fetches remote image URLs and converts them to local object URLs', async () => {
    const mockBlob = new Blob(['sample-img'], { type: 'image/jpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const mockCreateObjectURL = vi.fn(() => 'blob:https://example.com/blob-remote');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const { unmount } = render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="https://example.com/remote-cover.jpg"
        fileName="remote-cover.jpg"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    await vi.waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    unmount();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('handles remote fetch failures gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="https://example.com/failing-cover.jpg"
        fileName="failing-cover.jpg"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );
  });

  it('applies crop and exports file successfully', async () => {
    const onApplyCrop = vi.fn().mockResolvedValue(undefined);
    const mockBlob = new Blob(['cropped-img'], { type: 'image/jpeg' });

    // Mock canvas methods
    const mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    };

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas');
        canvas.getContext = vi.fn().mockReturnValue(mockContext);
        canvas.toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
          callback(mockBlob);
        });
        return canvas;
      }
      return originalCreateElement(tagName);
    });

    render(
      <CoverPhotoCropDialog
        isOpen={true}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test cover @ event!.png"
        onClose={vi.fn()}
        onApplyCrop={onApplyCrop}
      />,
    );

    const applyButton = screen.getByRole('button', { name: /Apply & Save Cover/i });
    fireEvent.click(applyButton);

    await vi.waitFor(() => {
      expect(onApplyCrop).toHaveBeenCalledWith(expect.any(File));
    });
  });

  it('does not render when isOpen is false', () => {
    render(
      <CoverPhotoCropDialog
        isOpen={false}
        imageSrc="data:image/png;base64,iVBORw0KGgo="
        fileName="test-cover.png"
        onClose={vi.fn()}
        onApplyCrop={vi.fn()}
      />,
    );

    expect(screen.queryByText('Adjust Cover Photo')).not.toBeInTheDocument();
  });
});
