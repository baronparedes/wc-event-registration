import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toJpeg } from 'html-to-image';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LEGAL_CONFIG } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';

import { ShareEventDialog } from '../ShareEventDialog';

vi.mock('html-to-image', () => ({
  toJpeg: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ShareEventDialog', () => {
  const mockEvent: AdminEvent = {
    id: 'evt-1',
    slug: 'annual-gala',
    title: 'Annual Gala 2026',
    description: 'Special gala night',
    location: 'Grand Ballroom',
    starts_at: '2026-12-25T18:00:00Z',
    ends_at: '2026-12-25T22:00:00Z',
    registration_opens_at: null,
    registration_closes_at: null,
    status: 'published',
    duplicate_policy: 'block',
    require_id_lookup: true,
    registration_mode: 'open',
    allow_public_registrations: true,
    metadata: {},
    created_by_admin_id: 'admin-1',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    member_registration_count: 10,
    public_registration_count: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['fake-image'], { type: 'image/jpeg' })),
    });
    vi.mocked(toJpeg).mockResolvedValue('data:image/jpeg;base64,mockJpegData');
  });

  it('does not render when isOpen is false', () => {
    render(<ShareEventDialog isOpen={false} onClose={vi.fn()} event={mockEvent} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render when event is null', () => {
    render(<ShareEventDialog isOpen={true} onClose={vi.fn()} event={null} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders event details and branding correctly', () => {
    render(<ShareEventDialog isOpen={true} onClose={vi.fn()} event={mockEvent} />);

    expect(screen.getByRole('heading', { name: 'Share Schedule' })).toBeInTheDocument();
    expect(screen.getByText('Annual Gala 2026')).toBeInTheDocument();
    expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    expect(screen.getByText(`Generated via ${LEGAL_CONFIG.appName}`)).toBeInTheDocument();
  });

  it('renders TBA when dates are not provided', () => {
    const eventWithoutDates = {
      ...mockEvent,
      starts_at: null,
      ends_at: null,
    } as unknown as AdminEvent;

    render(<ShareEventDialog isOpen={true} onClose={vi.fn()} event={eventWithoutDates} />);

    const tbaElements = screen.getAllByText('TBA');
    expect(tbaElements).toHaveLength(2);
  });

  it('calls navigator.share when available and supported', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareMock, configurable: true });

    render(<ShareEventDialog isOpen={true} onClose={vi.fn()} event={mockEvent} />);

    const shareButton = screen.getByRole('button', { name: /Share Image/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(toJpeg).toHaveBeenCalled();
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Annual Gala 2026',
          text: 'Join us for Annual Gala 2026!',
        }),
      );
    });
  });

  it('ignores AbortError from navigator.share gracefully without error toast', async () => {
    const abortError = new DOMException('User cancelled share', 'AbortError');
    const shareMock = vi.fn().mockRejectedValue(abortError);
    const canShareMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareMock, configurable: true });

    render(<ShareEventDialog isOpen={true} onClose={vi.fn()} event={mockEvent} />);

    const shareButton = screen.getByRole('button', { name: /Share Image/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalled();
    });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('falls back to downloading the image when native sharing is unavailable', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ShareEventDialog isOpen={true} onClose={vi.fn()} event={mockEvent} />);

    const shareButton = screen.getByRole('button', { name: /Share Image/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Schedule image downloaded');
    });

    clickSpy.mockRestore();
  });

  it('shows error toast when image generation fails', async () => {
    vi.mocked(toJpeg).mockRejectedValueOnce(new Error('Canvas error'));

    render(<ShareEventDialog isOpen={true} onClose={vi.fn()} event={mockEvent} />);

    const shareButton = screen.getByRole('button', { name: /Share Image/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to generate schedule image');
    });
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<ShareEventDialog isOpen={true} onClose={onCloseMock} event={mockEvent} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('saves image directly when Save Image is clicked', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ShareEventDialog isOpen={true} onClose={vi.fn()} event={mockEvent} />);

    const saveButton = screen.getByRole('button', { name: /Save Image/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Schedule image saved');
    });

    clickSpy.mockRestore();
  });
});
